/**
 * Bank Transfer Webhook Handler
 * 
 * POST /api/webhooks/bank-transfer
 * Handle bank transfer status callbacks from providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';

interface BankTransferWebhook {
  event: string;
  data: {
    id: string;
    tx_ref: string;
    flw_ref?: string;
    device_fingerprint?: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    ip: string;
    narration: string;
    status: string;
    payment_type: string;
    created_at: string;
    account_id: number;
    customer: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BankTransferWebhook = await request.json();
    
    console.log('Bank transfer webhook received:', JSON.stringify(body, null, 2));

    // Verify webhook signature (implement based on provider)
    // const signature = request.headers.get('verif-hash');
    // if (!verifyWebhookSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const adminSupabase = createAdminClient();
    
    // Extract payout ID from reference
    const reference = body.data.tx_ref;
    const payoutId = reference.replace('PAYOUT-', '');

    // Find the payout record
    const { data: payout, error: fetchError } = await adminSupabase
      .from('payouts')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (fetchError || !payout) {
      console.error('Payout not found for reference:', reference);
      return NextResponse.json({ 
        status: 'success',
        message: 'Webhook received'
      });
    }

    // Process the webhook based on event type and status
    let updateData: any = {};

    if (body.event === 'transfer.completed' && body.data.status === 'SUCCESSFUL') {
      updateData = {
        status: 'completed',
        transaction_reference: body.data.id.toString(),
        processed_at: new Date().toISOString()
      };
      console.log(`Bank transfer ${payoutId} completed successfully`);
    } else if (body.event === 'transfer.failed' || body.data.status === 'FAILED') {
      updateData = {
        status: 'failed',
        transaction_reference: `FAILED: ${body.data.processor_response || 'Transfer failed'}`
      };
      console.log(`Bank transfer ${payoutId} failed: ${body.data.processor_response}`);
    } else {
      // For other statuses, just log
      console.log(`Bank transfer ${payoutId} status: ${body.data.status}`);
    }

    // Update payout if we have update data
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await adminSupabase
        .from('payouts')
        .update(updateData)
        .eq('id', payoutId);

      if (updateError) {
        console.error('Failed to update payout status:', updateError);
      }
    }

    // Store the webhook for audit purposes
    const { error: auditError } = await adminSupabase
      .from('bank_transfer_webhooks')
      .insert({
        payout_id: payoutId,
        event_type: body.event,
        status: body.data.status,
        transaction_id: body.data.id.toString(),
        reference: reference,
        webhook_data: body,
        created_at: new Date().toISOString()
      });

    if (auditError) {
      console.error('Failed to store webhook audit:', auditError);
    }

    return NextResponse.json({
      status: 'success',
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Bank transfer webhook error:', error);
    
    return NextResponse.json({
      status: 'success',
      message: 'Webhook received'
    });
  }
}

// Webhook signature verification (implement based on provider)
function verifyWebhookSignature(body: any, signature: string | null): boolean {
  if (!signature) return false;
  
  // Implement signature verification based on your bank transfer provider
  // For Flutterwave, you would use their secret hash
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secretHash) return true; // Skip verification if no secret configured
  
  // This is a placeholder - implement actual signature verification
  return true;
}