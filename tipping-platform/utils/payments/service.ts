import { createClient } from '@supabase/supabase-js';
import { Tables, TablesInsert } from '@/types_db';
import { PaymentValidator, formatValidationErrors } from './validation';
import { commissionService } from '@/utils/commission/service';

type PaymentMethod = 'mpesa' | 'card';

// Use service role client to bypass RLS for testing
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export interface CreateTipRequest {
  amount: number;
  tipType: 'waiter' | 'restaurant';
  restaurantId: string;
  waiterId?: string;
  tableId?: string; // Optional for universal QR codes
  paymentMethod: PaymentMethod;
  customerPhone?: string;
}

export interface PaymentResponse {
  success: boolean;
  tipId: string;
  paymentMethod: PaymentMethod;
  stkPushId?: string; // For M-Pesa payments
  paymentLink?: string; // For Card payments (deprecated, use paymentUrl)
  paymentUrl?: string; // For Card payments
  message?: string;
  error?: string;
}

export class PaymentService {
  private getSupabase() {
    return createServiceClient();
  }

  /**
   * Calculate commission and net amount based on restaurant's commission rate
   */
  private async calculateCommission(restaurantId: string, amount: number) {
    try {
      // Get commission rate from commission service
      const commissionRate = await commissionService.getCommissionRate(restaurantId);
      
      // Calculate commission using the commission service
      const calculation = commissionService.calculateCommission(amount, commissionRate);

      return {
        commissionRate: calculation.commissionRate,
        commissionAmount: calculation.commissionAmount,
        netAmount: calculation.netAmount
      };
    } catch (error) {
      console.error('Error calculating commission:', error);
      throw new Error('Failed to calculate commission');
    }
  }

  /**
   * Validate tip request data using unified validation
   */
  private validateTipRequest(request: CreateTipRequest): void {
    const validation = PaymentValidator.validateTipData(request);
    
    if (!validation.isValid) {
      throw new Error(formatValidationErrors(validation.errors));
    }

    // Additional payment method specific validation
    const paymentMethodValidation = PaymentValidator.validatePaymentMethodRequirements(
      request.paymentMethod,
      { customerPhone: request.customerPhone }
    );

    if (!paymentMethodValidation.isValid) {
      throw new Error(formatValidationErrors(paymentMethodValidation.errors));
    }
  }

  /**
   * Create a tip record in the database
   */
  private async createTipRecord(request: CreateTipRequest, commission: any): Promise<Tables<'tips'>> {
    const tipData = {
      restaurant_id: request.restaurantId,
      waiter_id: request.waiterId || null,
      table_id: request.tableId,
      amount: request.amount,
      commission_amount: commission.commissionAmount,
      net_amount: commission.netAmount,
      tip_type: request.tipType,
      payment_method: request.paymentMethod,
      payment_status: 'pending',
      customer_phone: request.customerPhone || null
    };

    const supabase = this.getSupabase();
    const { data: tip, error } = await (supabase as any)
      .from('tips')
      .insert(tipData)
      .select()
      .single();

    if (error || !tip) {
      console.error('Error creating tip:', error);
      throw new Error('Failed to create tip record');
    }

    return tip as Tables<'tips'>;
  }

  /**
   * Process M-Pesa payment using PesaWise only
   */
  private async processMPesaPayment(tip: Tables<'tips'>, request: CreateTipRequest): Promise<PaymentResponse> {
    try {
      // Normalize phone number for consistency
      const normalizedPhone = request.customerPhone 
        ? PaymentValidator.normalizePhoneNumber(request.customerPhone)
        : null;

      if (!normalizedPhone) {
        throw new Error('Valid phone number is required for M-Pesa payments');
      }

      console.log('Initiating M-Pesa payment via PesaWise:', {
        tipId: tip.id,
        amount: request.amount,
        phone: normalizedPhone
      });

      // Use PesaWise
      const { pesaWiseService } = await import('@/utils/pesawise/service');
      
      const stkPushResponse = await pesaWiseService.initiateSTKPush({
        phoneNumber: normalizedPhone,
        amount: request.amount,
        accountReference: `TIP-${tip.id}`,
        transactionDesc: `Tip payment for ${request.tipType === 'waiter' ? 'waiter' : 'restaurant'}`
      });

      if (!stkPushResponse.success) {
        throw new Error(stkPushResponse.error || stkPushResponse.message || 'PesaWise STK Push failed');
      }

      console.log('PesaWise STK Push successful:', stkPushResponse);

      // Update tip with PesaWise transaction details
      const supabase = this.getSupabase();
      const { error } = await (supabase as any)
        .from('tips')
        .update({ 
          payment_status: 'processing',
          transaction_id: stkPushResponse.checkout_request_id || `TXN-${tip.id}`,
          customer_phone: normalizedPhone,
          metadata: {
            merchantRequestId: stkPushResponse.merchant_request_id,
            checkoutRequestId: stkPushResponse.checkout_request_id,
            stkPushInitiated: new Date().toISOString(),
            provider: 'pesawise'
          }
        })
        .eq('id', tip.id);

      if (error) {
        console.error('Error updating tip for PesaWise:', error);
      }

      return {
        success: true,
        tipId: tip.id,
        paymentMethod: 'mpesa',
        message: stkPushResponse.customer_message || stkPushResponse.message || 'STK Push sent to your phone',
        stkPushId: stkPushResponse.checkout_request_id
      };

    } catch (error) {
      console.error('M-Pesa payment error:', error);
      
      // Update tip status to failed
      const supabase = this.getSupabase();
      const { error: updateError } = await (supabase as any)
        .from('tips')
        .update({ 
          payment_status: 'failed',
          metadata: {
            error: error instanceof Error ? error.message : 'M-Pesa payment failed',
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', tip.id);

      if (updateError) {
        console.error('Error updating tip status to failed:', updateError);
      }

      throw new Error(error instanceof Error ? error.message : 'M-Pesa payment failed');
    }
  }

  /**
   * Process Card payment using PesaWise payment link
   */
  private async processCardPayment(tip: Tables<'tips'>, request: CreateTipRequest): Promise<PaymentResponse> {
    try {
      console.log('Initiating Card payment via PesaWise:', {
        tipId: tip.id,
        amount: request.amount
      });

      // Use PesaWise to create payment link
      const { pesaWiseService } = await import('@/utils/pesawise/service');
      
      const paymentLinkResponse = await pesaWiseService.createPaymentLink({
        amount: request.amount,
        accountReference: `TIP-${tip.id}`,
        transactionDesc: `Tip payment for ${request.tipType === 'waiter' ? 'waiter' : 'restaurant'}`,
        payeeName: 'Tippy Platform'
      });

      if (!paymentLinkResponse.success) {
        throw new Error(paymentLinkResponse.error || paymentLinkResponse.message || 'PesaWise payment link creation failed');
      }

      console.log('PesaWise payment link created:', paymentLinkResponse);

      // Check if this is test mode (payment link starts with TEST_MODE)
      const isTestMode = paymentLinkResponse.payment_link?.startsWith('TEST_MODE');

      // Update tip with payment link details
      const supabase = this.getSupabase();
      const { error } = await (supabase as any)
        .from('tips')
        .update({ 
          payment_status: isTestMode ? 'completed' : 'processing', // Auto-complete in test mode
          transaction_id: paymentLinkResponse.payment_link_id || `LINK-${tip.id}`,
          metadata: {
            paymentLink: paymentLinkResponse.payment_link,
            paymentLinkId: paymentLinkResponse.payment_link_id,
            linkCreated: new Date().toISOString(),
            provider: 'pesawise',
            testMode: isTestMode
          }
        })
        .eq('id', tip.id);

      if (error) {
        console.error('Error updating tip for card payment:', error);
      }

      // In test mode, don't redirect - just show success
      if (isTestMode) {
        return {
          success: true,
          tipId: tip.id,
          paymentMethod: 'mpesa',
          message: '🧪 TEST MODE: Card payment completed successfully! (No real payment was processed)',
          paymentUrl: undefined // Don't redirect in test mode
        };
      }

      return {
        success: true,
        tipId: tip.id,
        paymentMethod: 'mpesa', // PesaWise links support multiple methods including card
        message: paymentLinkResponse.message || 'Payment link created. Redirecting...',
        paymentUrl: paymentLinkResponse.payment_link // Frontend expects paymentUrl
      };

    } catch (error) {
      console.error('Card payment error:', error);
      
      // Update tip status to failed
      const supabase = this.getSupabase();
      const { error: updateError } = await (supabase as any)
        .from('tips')
        .update({ 
          payment_status: 'failed',
          metadata: {
            error: error instanceof Error ? error.message : 'Card payment failed',
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', tip.id);

      if (updateError) {
        console.error('Error updating tip status to failed:', updateError);
      }

      throw new Error(error instanceof Error ? error.message : 'Card payment failed');
    }
  }

  /**
   * Main method to create a tip and initiate payment
   */
  async createTipAndInitiatePayment(request: CreateTipRequest): Promise<PaymentResponse> {
    try {
      // Validate request
      this.validateTipRequest(request);

      // Calculate commission
      const commission = await this.calculateCommission(request.restaurantId, request.amount);

      // Create tip record
      const tip = await this.createTipRecord(request, commission);

      // Process payment based on method
      if (request.paymentMethod === 'mpesa') {
        return await this.processMPesaPayment(tip, request);
      } else if (request.paymentMethod === 'card') {
        return await this.processCardPayment(tip, request);
      } else {
        throw new Error('Invalid payment method. Only M-Pesa and Card are supported.');
      }

    } catch (error) {
      console.error('Payment service error:', error);
      return {
        success: false,
        tipId: '',
        paymentMethod: request.paymentMethod,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update tip status (used by webhooks)
   */
  async updateTipStatus(tipId: string, status: 'completed' | 'failed' | 'cancelled', transactionId?: string): Promise<void> {
    const updateData: any = {
      payment_status: status,
      updated_at: new Date().toISOString()
    };

    if (transactionId) {
      updateData.transaction_id = transactionId;
    }

    const supabase = this.getSupabase();
    const { error } = await (supabase as any)
      .from('tips')
      .update(updateData)
      .eq('id', tipId);

    if (error) {
      console.error('Error updating tip status:', error);
      throw new Error('Failed to update tip status');
    }
  }

  /**
   * Get tip by ID
   */
  async getTipById(tipId: string): Promise<Tables<'tips'> | null> {
    const supabase = this.getSupabase();
    const { data: tip, error } = await supabase
      .from('tips')
      .select('*')
      .eq('id', tipId)
      .single();

    if (error) {
      console.error('Error fetching tip:', error);
      return null;
    }

    return tip;
  }

  /**
   * Query M-Pesa payment status
   */
  async queryMPesaPaymentStatus(tipId: string): Promise<{
    success: boolean;
    status: string;
    message: string;
  }> {
    try {
      const tip = await this.getTipById(tipId);
      if (!tip) {
        return {
          success: false,
          status: 'not_found',
          message: 'Tip not found'
        };
      }

      if (tip.payment_method !== 'mpesa') {
        return {
          success: false,
          status: 'invalid_method',
          message: 'Tip is not an M-Pesa payment'
        };
      }

      const currentStatus = tip.payment_status || 'pending';

      // If payment is already completed or failed, return current status
      if (['completed', 'failed', 'cancelled', 'timeout'].includes(currentStatus)) {
        return {
          success: true,
          status: currentStatus,
          message: `Payment is ${currentStatus}`
        };
      }

      // Query M-Pesa API for pending payments
      if (tip.transaction_id && currentStatus === 'processing') {
        try {
          const { mpesaService } = await import('@/utils/mpesa/service');
          const queryResponse = await mpesaService.querySTKPushStatus(tip.transaction_id);
          
          const status = mpesaService.parseTransactionStatus(parseInt(queryResponse.ResultCode));
          
          // Update tip status based on query result
          if (status !== 'processing' && ['completed', 'failed', 'cancelled'].includes(status)) {
            await this.updateTipStatus(tipId, status as 'completed' | 'failed' | 'cancelled');
          }

          return {
            success: true,
            status: status,
            message: queryResponse.ResultDesc || `Payment is ${status}`
          };
        } catch (queryError) {
          console.error('Error querying M-Pesa status:', queryError);
          return {
            success: true,
            status: currentStatus,
            message: 'Unable to query payment status, please check later'
          };
        }
      }

      return {
        success: true,
        status: currentStatus,
        message: `Payment is ${currentStatus}`
      };

    } catch (error) {
      console.error('Error querying M-Pesa payment status:', error);
      return {
        success: false,
        status: 'error',
        message: 'Failed to query payment status'
      };
    }
  }

  /**
   * Get tips for a restaurant with optional filters
   */
  async getRestaurantTips(
    restaurantId: string, 
    filters?: {
      startDate?: string;
      endDate?: string;
      paymentMethod?: PaymentMethod;
      paymentStatus?: string;
      waiterId?: string;
    }
  ): Promise<Tables<'tips'>[]> {
    const supabase = this.getSupabase();
    let query = supabase
      .from('tips')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod);
    }

    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus);
    }

    if (filters?.waiterId) {
      query = query.eq('waiter_id', filters.waiterId);
    }

    const { data: tips, error } = await query;

    if (error) {
      console.error('Error fetching restaurant tips:', error);
      return [];
    }

    return tips || [];
  }
}

// Export singleton instance
export const paymentService = new PaymentService();