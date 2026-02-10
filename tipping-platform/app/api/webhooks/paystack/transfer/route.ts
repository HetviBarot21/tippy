import { NextRequest, NextResponse } from 'next/server';
import { payoutService } from '@/utils/payouts/service';
import { payoutNotificationService } from '@/utils/payouts/notifications';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received Paystack transfer webhook:', JSON.stringify(body, null, 2));

    // Validate webhook signature
    const signature = request.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    
    if (signature && secret) {
      const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');
      if (hash !== signature) {
        console.error('Invalid Paystack webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Extract transfer details
    const transferData = body.data;
    if (!transferData || body.event !== 'transfer.success' && body.event !== 'transfer.failed') {
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

    // Determine status based on Paystack event
    const status = body.event === 'transfer.success' ? 'completed' : 'failed';

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
    console.error('Error processing Paystack transfer webhook:', error);
    
    // Still return success to avoid retries
    return NextResponse.json({ message: 'Webhook received' });
  }
}