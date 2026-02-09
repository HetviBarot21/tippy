/**
 * Payouts API
 * 
 * GET /api/payouts - List payouts with filters
 * POST /api/payouts - Create a new payout record
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createPayoutSchema, payoutQuerySchema } from '@/types/payout';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const filters = payoutQuerySchema.parse(queryParams);
    const supabase = createClient();

    // Build query
    let query = supabase
      .from('payouts')
      .select(`
        *,
        waiter:waiters(id, name, phone_number),
        restaurant:restaurants(id, name)
      `);

    // Apply filters
    if (filters.restaurant_id) {
      query = query.eq('restaurant_id', filters.restaurant_id);
    }
    if (filters.waiter_id) {
      query = query.eq('waiter_id', filters.waiter_id);
    }
    if (filters.payout_type) {
      query = query.eq('payout_type', filters.payout_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.payout_month) {
      query = query.eq('payout_month', `${filters.payout_month}-01`);
    }
    if (filters.group_name) {
      query = query.eq('group_name', filters.group_name);
    }

    const { data: payouts, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch payouts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ payouts });

  } catch (error) {
    console.error('Payouts GET API error:', error);
    
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payoutData = createPayoutSchema.parse(body);
    
    const supabase = createClient();

    // Verify restaurant access
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', payoutData.restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found or access denied' },
        { status: 404 }
      );
    }

    // If waiter payout, verify waiter exists and belongs to restaurant
    if (payoutData.payout_type === 'waiter' && payoutData.waiter_id) {
      const { data: waiter, error: waiterError } = await supabase
        .from('waiters')
        .select('id, phone_number')
        .eq('id', payoutData.waiter_id)
        .eq('restaurant_id', payoutData.restaurant_id)
        .single();

      if (waiterError || !waiter) {
        return NextResponse.json(
          { error: 'Waiter not found or does not belong to restaurant' },
          { status: 404 }
        );
      }

      // Set recipient phone from waiter if not provided
      if (!payoutData.recipient_phone) {
        payoutData.recipient_phone = waiter.phone_number;
      }
    }

    // Create payout record
    const { data: payout, error } = await supabase
      .from('payouts')
      .insert({
        ...payoutData,
        payout_month: `${payoutData.payout_month}-01`,
        status: 'pending'
      })
      .select(`
        *,
        waiter:waiters(id, name, phone_number),
        restaurant:restaurants(id, name)
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create payout' },
        { status: 500 }
      );
    }

    return NextResponse.json({ payout }, { status: 201 });

  } catch (error) {
    console.error('Payouts POST API error:', error);
    
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