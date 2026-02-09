/**
 * Payout Notifications API
 * 
 * POST /api/payouts/notifications
 * Send payout notifications to recipients
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPayoutNotifications, getPayoutProcessingStatus } from '@/utils/payouts/processor';
import { createClient } from '@/utils/supabase/server';

const notificationSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  restaurant_id: z.string().uuid().optional()
});

const statusSchema = z.object({
  restaurant_id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, restaurant_id } = notificationSchema.parse(body);

    // If restaurant_id is provided, verify access
    if (restaurant_id) {
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
    }

    // Send notifications
    const result = await sendPayoutNotifications(month);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: result.message,
      notifications_sent: result.notifications_sent
    });

  } catch (error) {
    console.error('Payout notifications API error:', error);
    
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const { restaurant_id, month } = statusSchema.parse(queryParams);

    // Verify restaurant access
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

    // Get payout processing status
    const result = await getPayoutProcessingStatus(restaurant_id, month);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      restaurant: restaurant.name,
      month,
      status: result.status
    });

  } catch (error) {
    console.error('Payout status API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}