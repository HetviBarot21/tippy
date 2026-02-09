/**
 * Payout Processing API
 * 
 * POST /api/payouts/process
 * Process M-Pesa payouts for waiters
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processMpesaPayouts, retryFailedPayouts } from '@/utils/payouts/processor';
import { createClient } from '@/utils/supabase/server';

const processPayoutSchema = z.object({
  payout_ids: z.array(z.string().uuid()).min(1),
  action: z.enum(['process', 'retry']).optional().default('process')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payout_ids, action } = processPayoutSchema.parse(body);

    // Verify user has access to these payouts
    const supabase = createClient();
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('id, restaurant_id, payout_type, status')
      .in('id', payout_ids);

    if (payoutsError || !payouts || payouts.length === 0) {
      return NextResponse.json(
        { error: 'Payouts not found or access denied' },
        { status: 404 }
      );
    }

    // Verify all payouts belong to accessible restaurants
    const restaurantIds = [...new Set(payouts.map(p => p.restaurant_id))];
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id')
      .in('id', restaurantIds);

    if (restaurantsError || !restaurants || restaurants.length !== restaurantIds.length) {
      return NextResponse.json(
        { error: 'Access denied to some restaurants' },
        { status: 403 }
      );
    }

    // Only process waiter payouts via M-Pesa
    const waiterPayouts = payouts.filter(p => p.payout_type === 'waiter');
    if (waiterPayouts.length === 0) {
      return NextResponse.json(
        { error: 'No waiter payouts found for M-Pesa processing' },
        { status: 400 }
      );
    }

    // Validate payout status based on action
    if (action === 'process') {
      const invalidPayouts = waiterPayouts.filter(p => p.status !== 'pending');
      if (invalidPayouts.length > 0) {
        return NextResponse.json(
          { 
            error: 'Some payouts are not in pending status',
            invalid_payouts: invalidPayouts.map(p => ({ id: p.id, status: p.status }))
          },
          { status: 400 }
        );
      }
    } else if (action === 'retry') {
      const invalidPayouts = waiterPayouts.filter(p => p.status !== 'failed');
      if (invalidPayouts.length > 0) {
        return NextResponse.json(
          { 
            error: 'Some payouts are not in failed status',
            invalid_payouts: invalidPayouts.map(p => ({ id: p.id, status: p.status }))
          },
          { status: 400 }
        );
      }
    }

    // Process payouts
    const waiterPayoutIds = waiterPayouts.map(p => p.id);
    const result = action === 'retry' 
      ? await retryFailedPayouts(waiterPayoutIds)
      : await processMpesaPayouts(waiterPayoutIds);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, details: result.results },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: result.message,
      processed_count: result.processed_count,
      failed_count: result.failed_count,
      results: result.results
    });

  } catch (error) {
    console.error('Payout processing API error:', error);
    
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