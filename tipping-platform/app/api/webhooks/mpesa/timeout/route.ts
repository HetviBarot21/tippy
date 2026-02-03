/**
 * M-Pesa STK Push timeout webhook handler
 * This endpoint receives timeout notifications from M-Pesa
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client to bypass RLS
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('M-Pesa timeout received:', JSON.stringify(body, null, 2));

    // Extract timeout information
    const { CheckoutRequestID, MerchantRequestID } = body;

    if (CheckoutRequestID) {
      // Find and update the tip record
      const supabase = createServiceClient();
      const { data: tip, error: findError } = await supabase
        .from('tips')
        .select('*')
        .eq('transaction_id', CheckoutRequestID)
        .single();

      if (!findError && tip) {
        // Update tip status to timeout
        const { error: updateError } = await supabase
          .from('tips')
          .update({
            payment_status: 'timeout',
            updated_at: new Date().toISOString(),
            metadata: {
              timeoutReason: 'STK Push timeout',
              checkoutRequestId: CheckoutRequestID,
              merchantRequestId: MerchantRequestID,
              timeoutAt: new Date().toISOString()
            }
          })
          .eq('id', tip.id);

        if (updateError) {
          console.error('Error updating tip status to timeout:', updateError);
        } else {
          console.log(`Tip ${tip.id} marked as timeout`);
        }
      } else {
        console.error('Tip not found for timeout CheckoutRequestID:', CheckoutRequestID);
      }
    }

    // Always return success to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Timeout processed successfully'
    });

  } catch (error) {
    console.error('M-Pesa timeout processing error:', error);
    
    // Still return success to avoid M-Pesa retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Timeout received'
    });
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'M-Pesa timeout endpoint is active',
    timestamp: new Date().toISOString()
  });
}