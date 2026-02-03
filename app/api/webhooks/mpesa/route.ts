/**
 * M-Pesa Webhook Handler
 * 
 * Processes M-Pesa STK Push callbacks and updates payment status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/admin';
import { sendPaymentConfirmation } from '@/utils/notifications/service';
import type { MpesaCallbackData } from '@/utils/mpesa/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('M-Pesa callback received:', JSON.stringify(body, null, 2));
    
    // Extract callback data
    const callbackData = body.Body?.stkCallback as MpesaCallbackData;
    
    if (!callbackData) {
      console.error('Invalid M-Pesa callback format');
      return NextResponse.json({
        success: false,
        message: 'Invalid callback format'
      }, { status: 400 });
    }
    
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = callbackData;
    
    // Process the callback using the database function
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('process_mpesa_callback', {
      p_checkout_request_id: CheckoutRequestID,
      p_merchant_request_id: MerchantRequestID,
      p_result_code: ResultCode,
      p_result_desc: ResultDesc,
      p_callback_data: callbackData
    });
    
    if (error) {
      console.error('Error processing M-Pesa callback:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to process callback'
      }, { status: 500 });
    }
    
    // If payment was successful, send confirmation to customer
    if (ResultCode === 0) {
      try {
        // Get tip details for confirmation
        const { data: tipDetails } = await supabase
          .from('tips')
          .select(`
            id,
            amount,
            tip_type,
            transaction_id,
            customer_phone,
            restaurant:restaurants(name),
            waiter:waiters(name)
          `)
          .eq('id', (
            await supabase
              .from('mpesa_requests')
              .select('tip_id')
              .eq('checkout_request_id', CheckoutRequestID)
              .single()
          ).data?.tip_id)
          .single();
        
        if (tipDetails) {
          await sendPaymentConfirmation({
            tipId: tipDetails.id,
            customerPhone: tipDetails.customer_phone || undefined,
            amount: tipDetails.amount,
            transactionId: tipDetails.transaction_id || '',
            restaurantName: tipDetails.restaurant?.name || 'Restaurant',
            waiterName: tipDetails.waiter?.name,
            tipType: tipDetails.tip_type
          });
        }
      } catch (notificationError) {
        console.error('Failed to send payment confirmation:', notificationError);
        // Don't fail the webhook for notification errors
      }
    }
    
    console.log('M-Pesa callback processed successfully:', {
      CheckoutRequestID,
      ResultCode,
      ResultDesc
    });
    
    // Return success response to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully'
    });
    
  } catch (error) {
    console.error('M-Pesa webhook error:', error);
    
    // Always return success to M-Pesa to avoid retries
    // Log the error for debugging
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback received'
    });
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'M-Pesa webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}