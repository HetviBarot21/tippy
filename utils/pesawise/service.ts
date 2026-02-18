/**
 * Pesawise Payment Service
 * 
 * High-level service for processing tips via Pesawise (M-Pesa STK Push)
 */

'use server';

import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { createPesawiseClient } from './client';

export interface InitiateTipPaymentRequest {
  restaurantId: string;
  waiterId?: string;
  amount: number;
  phoneNumber?: string;
  tipType: 'waiter' | 'restaurant';
  tableId?: string;
  paymentMethod: 'mpesa' | 'card';
}

export interface InitiateTipPaymentResponse {
  success: boolean;
  tipId?: string;
  checkoutRequestId?: string;
  paymentLink?: string;
  message: string;
}

/**
 * Initiate a tip payment via M-Pesa STK Push or Card Payment Link
 */
export async function initiateTipPayment(
  request: InitiateTipPaymentRequest
): Promise<InitiateTipPaymentResponse> {
  try {
    const adminSupabase = createAdminClient();
    const pesawiseClient = createPesawiseClient();

    // Get restaurant details
    const { data: restaurant, error: restaurantError } = await adminSupabase
      .from('restaurants')
      .select('name, commission_rate')
      .eq('id', request.restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      throw new Error('Restaurant not found');
    }

    // Calculate commission
    const commissionRate = restaurant.commission_rate || 10;
    const commissionAmount = (request.amount * commissionRate) / 100;
    const netAmount = request.amount - commissionAmount;

    // Create tip record in pending status
    const { data: tip, error: tipError } = await adminSupabase
      .from('tips')
      .insert({
        restaurant_id: request.restaurantId,
        waiter_id: request.waiterId || null,
        table_id: request.tableId || null,
        amount: request.amount,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        tip_type: request.tipType,
        payment_method: request.paymentMethod,
        payment_status: 'pending',
        customer_phone: request.phoneNumber || null,
      })
      .select()
      .single();

    if (tipError || !tip) {
      throw new Error('Failed to create tip record');
    }

    // Handle M-Pesa STK Push
    if (request.paymentMethod === 'mpesa') {
      if (!request.phoneNumber) {
        throw new Error('Phone number required for M-Pesa payment');
      }

      const stkResult = await pesawiseClient.initiateSTKPush({
        phoneNumber: request.phoneNumber,
        amount: request.amount,
        balanceId: process.env.PESAWISE_BALANCE_ID!,
        reference: `TIP-${tip.id}`,
        description: `Tip for ${restaurant.name}`,
      });

      if (stkResult.success) {
        // Update tip with transaction reference
        await adminSupabase
          .from('tips')
          .update({
            transaction_id: stkResult.transactionId,
            payment_status: 'processing',
          })
          .eq('id', tip.id);

        return {
          success: true,
          tipId: tip.id,
          checkoutRequestId: stkResult.checkoutRequestId,
          message: 'STK Push sent successfully. Please check your phone.',
        };
      } else {
        // Update tip as failed
        await adminSupabase
          .from('tips')
          .update({
            payment_status: 'failed',
          })
          .eq('id', tip.id);

        return {
          success: false,
          message: stkResult.message || 'Failed to initiate M-Pesa payment',
        };
      }
    }

    // Handle Card Payment (via payment link)
    if (request.paymentMethod === 'card') {
      const linkResult = await pesawiseClient.createPaymentLink({
        amount: request.amount,
        balanceId: process.env.PESAWISE_BALANCE_ID!,
        reference: `TIP-${tip.id}`,
        description: `Tip for ${restaurant.name}`,
        payeeName: restaurant.name,
        isFlexibleAmount: false,
        isRecurring: false,
      });

      if (linkResult.success) {
        // Update tip with payment link
        await adminSupabase
          .from('tips')
          .update({
            transaction_id: linkResult.linkId,
            payment_status: 'processing',
          })
          .eq('id', tip.id);

        return {
          success: true,
          tipId: tip.id,
          paymentLink: linkResult.paymentLink,
          message: 'Payment link created successfully. Redirecting to payment page.',
        };
      } else {
        // Update tip as failed
        await adminSupabase
          .from('tips')
          .update({
            payment_status: 'failed',
          })
          .eq('id', tip.id);

        return {
          success: false,
          message: linkResult.message || 'Failed to create payment link',
        };
      }
    }

    throw new Error('Invalid payment method');
  } catch (error) {
    console.error('Initiate tip payment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Payment initiation failed',
    };
  }
}

/**
 * Check tip payment status
 */
export async function checkTipPaymentStatus(tipId: string): Promise<{
  success: boolean;
  status?: string;
  message: string;
}> {
  try {
    const adminSupabase = createAdminClient();

    const { data: tip, error } = await adminSupabase
      .from('tips')
      .select('payment_status, transaction_id')
      .eq('id', tipId)
      .single();

    if (error || !tip) {
      throw new Error('Tip not found');
    }

    // If already completed or failed, return current status
    if (tip.payment_status === 'completed' || tip.payment_status === 'failed') {
      return {
        success: true,
        status: tip.payment_status as string,
        message: `Payment ${tip.payment_status}`,
      };
    }

    // Query Pesawise for transaction status
    if (tip.transaction_id) {
      const pesawiseClient = createPesawiseClient();
      const statusResult = await pesawiseClient.queryTransactionStatus(tip.transaction_id);

      if (statusResult.success && statusResult.status) {
        // Map Pesawise status to our status
        let paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' = tip.payment_status as any;
        if (statusResult.status === 'completed' || statusResult.status === 'success') {
          paymentStatus = 'completed';
        } else if (statusResult.status === 'failed' || statusResult.status === 'cancelled') {
          paymentStatus = 'failed';
        }

        // Update tip status if changed
        if (paymentStatus !== tip.payment_status) {
          await adminSupabase
            .from('tips')
            .update({ payment_status: paymentStatus })
            .eq('id', tipId);
        }

        return {
          success: true,
          status: paymentStatus as string,
          message: `Payment ${paymentStatus}`,
        };
      }
    }

    return {
      success: true,
      status: (tip.payment_status || 'processing') as string,
      message: 'Payment is still processing',
    };
  } catch (error) {
    console.error('Check tip payment status error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to check payment status',
    };
  }
}

/**
 * Get wallet transactions for dashboard
 */
export async function getWalletTransactions(params: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  transactions?: any[];
  total?: number;
  message: string;
}> {
  try {
    const pesawiseClient = createPesawiseClient();

    const result = await pesawiseClient.getWalletTransactions({
      balanceId: process.env.PESAWISE_BALANCE_ID!,
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page || 1,
      limit: params.limit || 50,
    });

    return result;
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get transactions',
    };
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(): Promise<{
  success: boolean;
  balance?: number;
  currency?: string;
  message: string;
}> {
  try {
    const pesawiseClient = createPesawiseClient();

    const result = await pesawiseClient.getBalance(process.env.PESAWISE_BALANCE_ID!);

    return result;
  } catch (error) {
    console.error('Get wallet balance error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get balance',
    };
  }
}
