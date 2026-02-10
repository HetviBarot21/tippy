import { NextRequest, NextResponse } from 'next/server';
import { payoutService } from '@/utils/payouts/service';
import { calculatePayoutSchema } from '@/types/payout';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const restaurantId = params.id;

    // Check authentication and restaurant access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = calculatePayoutSchema.parse({
      restaurant_id: restaurantId,
      ...body
    });

    // Calculate monthly payouts
    const calculation = await payoutService.calculateMonthlyPayouts({
      restaurantId: validatedData.restaurant_id,
      month: validatedData.month
    });

    // Check if payouts already exist for this month
    const hasExisting = await payoutService.hasPayoutsForMonth(
      validatedData.restaurant_id, 
      validatedData.month
    );

    return NextResponse.json({
      calculation,
      has_existing_payouts: hasExisting,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name
      }
    });

  } catch (error) {
    console.error('Error calculating payouts:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate payouts' },
      { status: 500 }
    );
  }
}