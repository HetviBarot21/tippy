import { stripe } from '@/utils/stripe/config';
import { createClient } from '@supabase/supabase-js';
import { Tables, TablesInsert } from '@/types_db';
import { PaymentValidator, formatValidationErrors } from './validation';
import { distributionService } from '@/utils/distribution/service';
import { commissionService } from '@/utils/commission/service';

type TipInsert = TablesInsert<'tips'>;
type PaymentMethod = 'card' | 'mpesa';

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
  tableId: string;
  paymentMethod: PaymentMethod;
  customerPhone?: string;
}

export interface PaymentResponse {
  success: boolean;
  tipId: string;
  paymentMethod: PaymentMethod;
  clientSecret?: string; // For card payments
  paymentIntentId?: string; // For card payments
  stkPushId?: string; // For M-Pesa payments
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
   * Process card payment using Stripe
   */
  private async processCardPayment(tip: Tables<'tips'>, request: CreateTipRequest): Promise<PaymentResponse> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: 'kes',
        metadata: {
          tipId: tip.id,
          restaurantId: request.restaurantId,
          tipType: request.tipType,
          waiterId: request.waiterId || '',
          tableId: request.tableId
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update tip with transaction ID and processing status
      const supabase = this.getSupabase();
      const { error } = await (supabase as any)
        .from('tips')
        .update({ 
          transaction_id: paymentIntent.id,
          payment_status: 'processing'
        })
        .eq('id', tip.id);

      if (error) {
        console.error('Error updating tip with payment intent:', error);
      }

      return {
        success: true,
        tipId: tip.id,
        paymentMethod: 'card',
        clientSecret: paymentIntent.client_secret || undefined,
        paymentIntentId: paymentIntent.id
      };

    } catch (error) {
      console.error('Stripe error:', error);
      
      // Update tip status to failed
      const supabase = this.getSupabase();
      const { error: updateError } = await (supabase as any)
        .from('tips')
        .update({ payment_status: 'failed' })
        .eq('id', tip.id);

      if (updateError) {
        console.error('Error updating tip status to failed:', updateError);
      }

      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Process M-Pesa payment (placeholder for now)
   */
  private async processMPesaPayment(tip: Tables<'tips'>, request: CreateTipRequest): Promise<PaymentResponse> {
    // TODO: Implement M-Pesa Daraja API integration
    // For now, return a placeholder response
    
    // Normalize phone number for consistency
    const normalizedPhone = request.customerPhone 
      ? PaymentValidator.normalizePhoneNumber(request.customerPhone)
      : null;
    
    // Update tip status to processing (would be done after STK push initiation)
    const supabase = this.getSupabase();
    const { error } = await (supabase as any)
      .from('tips')
      .update({ 
        payment_status: 'processing',
        transaction_id: `mpesa_${tip.id}_${Date.now()}`,
        customer_phone: normalizedPhone
      })
      .eq('id', tip.id);

    if (error) {
      console.error('Error updating tip for M-Pesa:', error);
    }

    return {
      success: true,
      tipId: tip.id,
      paymentMethod: 'mpesa',
      message: 'M-Pesa integration coming soon',
      stkPushId: `stk_${tip.id}_${Date.now()}`
    };
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
      if (request.paymentMethod === 'card') {
        return await this.processCardPayment(tip, request);
      } else if (request.paymentMethod === 'mpesa') {
        return await this.processMPesaPayment(tip, request);
      } else {
        throw new Error('Invalid payment method');
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