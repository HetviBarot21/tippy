import { NextRequest, NextResponse } from 'next/server';
import { payoutNotificationService } from '@/utils/payouts/notifications';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication - this should be restricted to admin users or cron jobs
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Processing upcoming payout notifications...');

    // Process upcoming payout notifications
    const result = await payoutNotificationService.processUpcomingPayoutNotifications();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Some notifications failed to send',
          ...result
        },
        { status: 207 } // Multi-status for partial success
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${result.successful_notifications} notifications`,
      ...result
    });

  } catch (error) {
    console.error('Error processing payout notifications:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process payout notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check notification status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get payouts that need upcoming notifications
    const payouts = await payoutNotificationService.getPayoutsNeedingUpcomingNotifications();

    return NextResponse.json({
      payouts_needing_notifications: payouts.length,
      payouts: payouts.map(payout => ({
        id: payout.id,
        restaurant_id: payout.restaurant_id,
        payout_type: payout.payout_type,
        amount: payout.amount,
        payout_month: payout.payout_month,
        waiter_id: payout.waiter_id,
        group_name: payout.group_name
      }))
    });

  } catch (error) {
    console.error('Error checking notification status:', error);
    return NextResponse.json(
      { error: 'Failed to check notification status' },
      { status: 500 }
    );
  }
}