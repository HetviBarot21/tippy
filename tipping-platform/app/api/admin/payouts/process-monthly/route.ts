import { NextRequest, NextResponse } from 'next/server';
import { payoutService } from '@/utils/payouts/service';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication - this should be restricted to admin users or cron jobs
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body for optional month parameter
    const body = await request.json().catch(() => ({}));
    const { month } = body;

    // Validate month format if provided
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM' },
        { status: 400 }
      );
    }

    console.log(`Starting monthly payout processing for month: ${month || 'current'}`);

    // Process monthly payouts for all restaurants
    const result = await payoutService.processMonthlyPayoutsForAllRestaurants(month);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Some payouts failed to process',
          processed_restaurants: result.processedRestaurants,
          total_payouts: result.totalPayouts,
          total_amount: result.totalAmount,
          errors: result.errors
        },
        { status: 207 } // Multi-status for partial success
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly payouts processed successfully',
      processed_restaurants: result.processedRestaurants,
      total_payouts: result.totalPayouts,
      total_amount: result.totalAmount,
      month: month || new Date().toISOString().slice(0, 7)
    });

  } catch (error) {
    console.error('Error processing monthly payouts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process monthly payouts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check the status of monthly payout processing
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM' },
        { status: 400 }
      );
    }

    // Get all restaurants and their payout status for the month
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, is_active')
      .eq('is_active', true);

    if (restaurantsError) {
      throw new Error('Failed to fetch restaurants');
    }

    const restaurantStatuses = await Promise.all(
      (restaurants || []).map(async (restaurant) => {
        const hasPayouts = await payoutService.hasPayoutsForMonth(restaurant.id, month);
        const summary = hasPayouts 
          ? await payoutService.getMonthlyPayoutSummary(restaurant.id, month)
          : null;

        return {
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          has_payouts: hasPayouts,
          summary
        };
      })
    );

    const totalRestaurants = restaurantStatuses.length;
    const processedRestaurants = restaurantStatuses.filter(r => r.has_payouts).length;
    const pendingRestaurants = totalRestaurants - processedRestaurants;

    return NextResponse.json({
      month,
      total_restaurants: totalRestaurants,
      processed_restaurants: processedRestaurants,
      pending_restaurants: pendingRestaurants,
      restaurant_statuses: restaurantStatuses
    });

  } catch (error) {
    console.error('Error checking payout status:', error);
    return NextResponse.json(
      { error: 'Failed to check payout status' },
      { status: 500 }
    );
  }
}