/**
 * PesaWise timeout webhook handler
 * This endpoint receives timeout notifications from PesaWise
 */

import { NextRequest, NextResponse } from 'next/server';
import { pesaWiseService } from '@/utils/pesawise/service';
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
    const signature = request.headers.get('x-signature');
    const timestamp = request.headers.get('x-timestamp');
    
    console.log('PesaWise timeout received:', JSON.stringify(body, null, 2));

    // Validate webhook signature
    if (signature && timestamp) {
      const isValidSignature = pesaWiseService.validateCallbackSignature(
        JSON.stringify(body),
        signature,
        timestamp
      );

      if (!isValidSignature) {
        console.error('Invalid PesaWise timeout signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const { checkout_request_id, merchant_request_id } = body;

    if (!checkout_request_id) {
      console.error('Missing checkout_request_id in timeout notification');
      return NextResponse.json({ error: 'Missing checkout_request_id' }, { status: 400 });
    }

    // Find and update the tip record
    const supabase = createServiceClient();
    const { error: updateError } = await supabase
      .from('tips')
      .update({
        payment_status: 'timeout',
        updated_at: new Date().toISOString(),
        metadata: {
          checkoutRequestId: checkout_request_id,
          merchantRequestId: merchant_request_id,
          timeoutAt: new Date().toISOString(),
          provider: 'pesawise'
        }
      })
      .eq('transaction_id', checkout_request_id);

    if (updateError) {
      console.error('Error updating tip status to timeout:', updateError);
    } else {
      console.log(`Tip with checkout_request_id ${checkout_request_id} marked as timeout via PesaWise`);
    }

    // Always return success to PesaWise
    return NextResponse.json({
      success: true,
      message: 'Timeout notification processed'
    });

  } catch (error) {
    console.error('PesaWise timeout processing error:', error);
    
    // Still return success to avoid PesaWise retries
    return NextResponse.json({
      success: true,
      message: 'Timeout notification received'
    });
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'PesaWise timeout endpoint is active',
    timestamp: new Date().toISOString()
  });
}