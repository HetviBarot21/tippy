/**
 * Individual Payout API
 * 
 * GET /api/payouts/[id] - Get payout details
 * PATCH /api/payouts/[id] - Update payout status
 * DELETE /api/payouts/[id] - Delete payout (only if pending)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { updatePayoutSchema, payoutParamsSchema } from '@/types/payout';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = payoutParamsSchema.parse(params);
    const supabase = createClient();

    const { data: payout, error } = await supabase
      .from('payouts')
      .select(`
        *,
        waiter:waiters(id, name, phone_number),
        restaurant:restaurants(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ payout });

  } catch (error) {
    console.error('Payout GET API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payout ID' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = payoutParamsSchema.parse(params);
    const body = await request.json();
    const updates = updatePayoutSchema.parse(body);
    
    const supabase = createClient();

    // Get current payout to verify access and status
    const { data: currentPayout, error: fetchError } = await supabase
      .from('payouts')
      .select('id, status, restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentPayout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    if (updates.status) {
      const validTransitions: Record<string, string[]> = {
        'pending': ['processing', 'failed'],
        'processing': ['completed', 'failed'],
        'completed': [], // No transitions from completed
        'failed': ['pending', 'processing'] // Allow retry
      };

      const allowedStatuses = validTransitions[currentPayout.status] || [];
      if (!allowedStatuses.includes(updates.status)) {
        return NextResponse.json(
          { 
            error: `Invalid status transition from ${currentPayout.status} to ${updates.status}`,
            allowed_statuses: allowedStatuses
          },
          { status: 400 }
        );
      }
    }

    // Update payout
    const updateData: any = { ...updates };
    if (updates.status === 'completed' && !updates.processed_at) {
      updateData.processed_at = new Date().toISOString();
    }

    const { data: payout, error } = await supabase
      .from('payouts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        waiter:waiters(id, name, phone_number),
        restaurant:restaurants(id, name)
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update payout' },
        { status: 500 }
      );
    }

    return NextResponse.json({ payout });

  } catch (error) {
    console.error('Payout PATCH API error:', error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = payoutParamsSchema.parse(params);
    const supabase = createClient();

    // Get current payout to verify status
    const { data: currentPayout, error: fetchError } = await supabase
      .from('payouts')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !currentPayout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of pending payouts
    if (currentPayout.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only delete pending payouts' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('payouts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete payout' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Payout deleted successfully' });

  } catch (error) {
    console.error('Payout DELETE API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payout ID' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}