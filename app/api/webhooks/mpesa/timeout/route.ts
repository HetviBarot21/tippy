/**
 * M-Pesa Timeout Webhook Handler
 * 
 * Handles M-Pesa timeout notifications when STK Push expires
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('M-Pesa timeout received:', JSON.stringify(body, null, 2));
    
    // Extract timeout data
    const timeoutData = body.Body?.stkCallback;
    
    if (!timeoutData) {
      console.error('Invalid M-Pesa timeout format');
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Timeout received'
      });
    }
    
    const { CheckoutRequestID, MerchantRequestID } = timeoutData;
    
    if (CheckoutRequestID) {
      // Update M-Pesa request status to cancelled
      const supabase = createClient();
      
      const { error: requestError } = await supabase
        .from('mpesa_requests')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('checkout_request_id', CheckoutRequestID);
      
      if (requestError) {
        console.error('Error updating M-Pesa request on timeout:', requestError);
      }
      
      // Update corresponding tip status
      const { data: mpesaRequest } = await supabase
        .from('mpesa_requests')
        .select('tip_id')
        .eq('checkout_request_id', CheckoutRequestID)
        .single();
      
      if (mpesaRequest?.tip_id) {
        const { error: tipError } = await supabase
          .from('tips')
          .update({ 
            payment_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', mpesaRequest.tip_id);
        
        if (tipError) {
          console.error('Error updating tip status on timeout:', tipError);
        }
      }
      
      console.log('M-Pesa timeout processed:', {
        CheckoutRequestID,
        MerchantRequestID
      });
    }
    
    // Return success response to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Timeout processed successfully'
    });
    
  } catch (error) {
    console.error('M-Pesa timeout webhook error:', error);
    
    // Always return success to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Timeout received'
    });
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'M-Pesa timeout webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}