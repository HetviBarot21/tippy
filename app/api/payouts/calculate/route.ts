/**
 * Payout Calculation API
 * 
 * POST /api/payouts/calculate
 * Calculate monthly payouts for a restaurant
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateMonthlyPayouts, generatePayoutRecords, getExistingPayouts } from '@/utils/payouts/service';
import { createClient } from '@/utils/supabase/server';

const calculatePayoutSchema = z.object({
  restaurant_id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  generate_records: z.boolean().optional().default(false)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, month, generate_records } = calculatePayoutSchema.parse(body);

    // Verify user has access to this restaurant
    const supabase = createClient();
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found or access denied' },
        { status: 404 }
      );
    }

    // Check if payouts already exist for this month
    const existingPayoutsResult = await getExistingPayouts(restaurant_id, month);
    if (!existingPayoutsResult.success) {
      return NextResponse.json(
        { error: existingPayoutsResult.message },
        { status: 500 }
      );
    }

    if (existingPayoutsResult.payouts && existingPayoutsResult.payouts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Payouts already exist for this month',
          existing_payouts: existingPayoutsResult.payouts.length
        },
        { status: 409 }
      );
    }

    // Calculate payouts
    const calculationResult = await calculateMonthlyPayouts({
      restaurant_id,
      month
    });

    if (!calculationResult.success || !calculationResult.data) {
      return NextResponse.json(
        { error: calculationResult.message },
        { status: 500 }
      );
    }

    let response: any = {
      calculation: calculationResult.data,
      restaurant: restaurant.name,
      month
    };

    // Generate payout records if requested
    if (generate_records) {
      const generateResult = await generatePayoutRecords(
        restaurant_id,
        month,
        calculationResult.data
      );

      if (!generateResult.success) {
        return NextResponse.json(
          { error: generateResult.message },
          { status: 500 }
        );
      }

      response.generated_payouts = {
        count: generateResult.payout_ids?.length || 0,
        payout_ids: generateResult.payout_ids || []
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Payout calculation API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}