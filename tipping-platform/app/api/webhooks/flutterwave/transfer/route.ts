import { NextRequest, NextResponse } from 'next/server';
import { payoutService } from '@/utils/payouts/service';
import { payoutNotificationService } from '@/utils/payouts/notifications';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received Flutterwave transfer webhook:', JSON.stringify(body, null, 2));

    // Validate webhook signature (implement based on Flutterwave documentation)
    // const signature = request.headers.get('verif-hash');
    // if (!validateFlutterwaveSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    // }

    // Extract transfer details
    const transferData = body.data;
    if (!transferData) {
      console.error('Invalid transfer webhook data:', body);
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    const supabase = createClient();

    // Find payout by reference
    const reference = transferData.reference;
    const { data: payouts, error } = await supabase
      .from('payouts')
      .select('*')
      .like('transaction_reference', `%${reference}%`)
      .eq('status', 'processing');

    if (error || !payouts || payouts.length === 0) {
      console.error('Payout not found for reference:', reference);
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    const payout = payouts[0];

    // Determine status based on Flutterwave response
    let status: 'completed' | 'failed';
    if (transferData.status === 'SUCCESSFUL') {
      status = 'completed';
    } else if (transferData.status === 'FAILED') {
      status = 'failed';
    } else {
      // Still processing, no action needed
      return NextResponse.json({ message: 'Transfer still processing' });
    }

    // Update payout status
    await payoutService.updatePayoutStatus(
      payout.id,
      status,
      transferData.id?.toString()
    );

    // Send notification based on status
    if (status === 'completed') {
      await payoutNotificationService.sendProcessedPayoutNotification(payout);
    } else {
      await payoutNotificationService.sendFailedPayoutNotification(payout);
    }

    console.log(`Updated payout ${payout.id} status to ${status} (Transfer ID: ${transferData.id})`);

    return NextResponse.json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Error processing Flutterwave transfer webhook:', error);
    
    // Still return success to avoid retries
    return NextResponse.json({ message: 'Webhook received' });
  }
}