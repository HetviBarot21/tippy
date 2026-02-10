import { NextRequest, NextResponse } from 'next/server';
import { payoutService } from '@/utils/payouts/service';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received M-Pesa B2C timeout:', JSON.stringify(body, null, 2));

    // Extract conversation ID from timeout callback
    const conversationId = body?.Result?.ConversationID;
    
    if (conversationId) {
      const supabase = createClient();
      
      // Find payout by conversation ID and mark as failed due to timeout
      const { data: payouts, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('transaction_reference', conversationId)
        .eq('status', 'processing');

      if (!error && payouts && payouts.length > 0) {
        const payout = payouts[0];
        
        // Update payout status to failed
        await payoutService.updatePayoutStatus(payout.id, 'failed');
        
        console.log(`Marked payout ${payout.id} as failed due to M-Pesa timeout`);
      }
    }

    // Respond with success
    return NextResponse.json({ 
      ResultCode: 0,
      ResultDesc: 'Timeout processed successfully'
    });

  } catch (error) {
    console.error('Error processing M-Pesa B2C timeout:', error);
    
    // Still return success to M-Pesa
    return NextResponse.json({ 
      ResultCode: 0,
      ResultDesc: 'Timeout received'
    });
  }
}