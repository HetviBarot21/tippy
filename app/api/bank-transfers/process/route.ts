/**
 * Bank Transfer Processing API
 * 
 * POST /api/bank-transfers/process
 * Process bank transfers for group payouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processBankTransfers } from '@/utils/bank-transfers/service';
import { createClient } from '@/utils/supabase/server';

const processBankTransferSchema = z.object({
  payout_ids: z.array(z.string().uuid()).min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payout_ids } = processBankTransferSchema.parse(body);

    // Verify user has access to these payouts
    const supabase = createClient();
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('id, restaurant_id, payout_type, status, recipient_account')
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

    // Only process group payouts via bank transfer
    const groupPayouts = payouts.filter(p => p.payout_type === 'group');
    if (groupPayouts.length === 0) {
      return NextResponse.json(
        { error: 'No group payouts found for bank transfer processing' },
        { status: 400 }
      );
    }

    // Validate payout status
    const invalidPayouts = groupPayouts.filter(p => p.status !== 'pending');
    if (invalidPayouts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some payouts are not in pending status',
          invalid_payouts: invalidPayouts.map(p => ({ id: p.id, status: p.status }))
        },
        { status: 400 }
      );
    }

    // Validate recipient accounts
    const invalidAccounts = [];
    for (const payout of groupPayouts) {
      if (!payout.recipient_account) {
        invalidAccounts.push({ id: payout.id, error: 'Missing recipient account' });
        continue;
      }

      try {
        const account = JSON.parse(payout.recipient_account);
        if (!account.account_number || !account.bank_code) {
          invalidAccounts.push({ id: payout.id, error: 'Invalid account details' });
        }
      } catch (error) {
        invalidAccounts.push({ id: payout.id, error: 'Invalid account format' });
      }
    }

    if (invalidAccounts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some payouts have invalid recipient accounts',
          invalid_accounts: invalidAccounts
        },
        { status: 400 }
      );
    }

    // Process bank transfers
    const groupPayoutIds = groupPayouts.map(p => p.id);
    const result = await processBankTransfers(groupPayoutIds);

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
    console.error('Bank transfer processing API error:', error);
    
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