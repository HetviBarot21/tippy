/**
 * Pesawise Webhook Handler
 * 
 * POST /api/webhooks/pesawise
 * Handles payment status callbacks from Pesawise
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Pesawise webhook received:', body);

    // Extract transaction details from webhook
    const {
      transactionId,
      reference,
      status,
      amount,
      phoneNumber,
      resultCode,
      resultDesc,
    } = body;

    if (!reference) {
      console.error('Webhook missing reference');
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    // Extract tip ID from reference (format: TIP-{tipId})
    const tipId = reference.replace('TIP-', '');

    const adminSupabase = createAdminClient();

    // Get the tip record
    const { data: tip, error: fetchError } = await adminSupabase
      .from('tips')
      .select('*')
      .eq('id', tipId)
      .single();

    if (fetchError || !tip) {
      console.error('Tip not found:', tipId);
      return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
    }

    // Determine payment status based on webhook data
    let paymentStatus = 'processing';
    
    if (status === 'completed' || status === 'success' || resultCode === '0') {
      paymentStatus = 'completed';
    } else if (status === 'failed' || status === 'cancelled' || resultCode !== '0') {
      paymentStatus = 'failed';
    }

    // Update tip record
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    };

    if (transactionId) {
      updateData.transaction_id = transactionId;
    }

    const { error: updateError } = await adminSupabase
      .from('tips')
      .update(updateData)
      .eq('id', tipId);

    if (updateError) {
      console.error('Failed to update tip:', updateError);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    console.log(`Tip ${tipId} updated to status: ${paymentStatus}`);

    // TODO: Send notification to waiter/restaurant if payment completed

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification if needed)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Pesawise webhook endpoint is active',
  });
}
