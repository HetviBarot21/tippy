/**
 * M-Pesa Payment Service
 * 
 * High-level service for handling M-Pesa payments in the Tippy platform
 */

'use server';

import { mpesaClient, MpesaClient } from './client';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import type { MpesaPaymentRequest } from '@/types/tip';

export interface MpesaPaymentResult {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  message: string;
  customerMessage?: string;
}

/**
 * Initiate M-Pesa payment for a tip
 */
export async function initiateMpesaPayment(
  request: MpesaPaymentRequest
): Promise<MpesaPaymentResult> {
  try {
    // Get tip details from database
    const supabase = createClient();
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .select(`
        *,
        restaurant:restaurants(name),
        waiter:waiters(name)
      `)
      .eq('id', request.tip_id)
      .single();

    if (tipError || !tip) {
      return {
        success: false,
        message: 'Tip not found'
      };
    }

    // Validate tip status
    if (tip.payment_status !== 'pending') {
      return {
        success: false,
        message: 'Tip payment already processed or in progress'
      };
    }

    // Validate amount matches
    if (tip.amount !== request.amount) {
      return {
        success: false,
        message: 'Amount mismatch'
      };
    }

    // Generate account reference and description
    const accountReference = `TIP-${tip.id.substring(0, 8)}`;
    const transactionDesc = tip.waiter 
      ? `Tip for ${tip.waiter.name} at ${tip.restaurant.name}`
      : `Tip for ${tip.restaurant.name}`;

    // Update tip status to processing
    const { error: updateError } = await supabase
      .from('tips')
      .update({ 
        payment_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', request.tip_id);

    if (updateError) {
      console.error('Failed to update tip status:', updateError);
      return {
        success: false,
        message: 'Failed to process payment request'
      };
    }

    // Initiate STK Push
    const stkResponse = await mpesaClient.initiateSTKPush({
      phoneNumber: request.phone_number,
      amount: request.amount,
      accountReference,
      transactionDesc
    });

    // Store M-Pesa request details
    const adminSupabase = createAdminClient();
    const { error: storeError } = await adminSupabase
      .from('mpesa_requests')
      .insert({
        tip_id: request.tip_id,
        checkout_request_id: stkResponse.CheckoutRequestID,
        merchant_request_id: stkResponse.MerchantRequestID,
        phone_number: request.phone_number,
        amount: request.amount,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (storeError) {
      console.error('Failed to store M-Pesa request:', storeError);
      // Don't fail the payment, just log the error
    }

    return {
      success: true,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
      message: 'Payment initiated successfully',
      customerMessage: stkResponse.CustomerMessage
    };

  } catch (error) {
    console.error('M-Pesa payment initiation error:', error);
    
    // Revert tip status back to pending on error
    try {
      const supabase = createClient();
      await supabase
        .from('tips')
        .update({ 
          payment_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.tip_id);
    } catch (revertError) {
      console.error('Failed to revert tip status:', revertError);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Payment initiation failed'
    };
  }
}

/**
 * Query M-Pesa payment status
 */
export async function queryMpesaPaymentStatus(checkoutRequestId: string) {
  try {
    const status = await mpesaClient.querySTKPushStatus(checkoutRequestId);
    return {
      success: true,
      data: status
    };
  } catch (error) {
    console.error('M-Pesa status query error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Status query failed'
    };
  }
}

/**
 * Validate phone number for M-Pesa
 */
export function validateMpesaPhoneNumber(phoneNumber: string): boolean {
  return MpesaClient.validatePhoneNumber(phoneNumber);
}