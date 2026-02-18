import { NextRequest, NextResponse } from 'next/server';
import { validateApiTenantAccess, createErrorResponse } from '@/utils/auth/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    
    const context = await validateApiTenantAccess(request, restaurantId);
    const { supabase } = context;

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('payout_schedule_enabled, payout_schedule_day, payout_notification_days')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      schedule: {
        enabled: restaurant.payout_schedule_enabled || false,
        payout_day: restaurant.payout_schedule_day || 28,
        notification_days: restaurant.payout_notification_days || 3
      }
    });

  } catch (error) {
    console.error('Error fetching payout schedule:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to fetch payout schedule'),
      500,
      { request, tenantId: params.id }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const body = await request.json();
    
    const context = await validateApiTenantAccess(request, restaurantId);
    const { supabase } = context;
    
    const { enabled, payout_day, notification_days } = body;

    // Validate inputs
    if (payout_day !== undefined && (payout_day < 1 || payout_day > 28)) {
      return NextResponse.json(
        { error: 'Payout day must be between 1 and 28' },
        { status: 400 }
      );
    }

    if (notification_days !== undefined && (notification_days < 0 || notification_days > 7)) {
      return NextResponse.json(
        { error: 'Notification days must be between 0 and 7' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (enabled !== undefined) updateData.payout_schedule_enabled = enabled;
    if (payout_day !== undefined) updateData.payout_schedule_day = payout_day;
    if (notification_days !== undefined) updateData.payout_notification_days = notification_days;

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', restaurantId)
      .select('payout_schedule_enabled, payout_schedule_day, payout_notification_days')
      .single();

    if (error) {
      console.error('Error updating payout schedule:', error);
      return NextResponse.json({ error: 'Failed to update payout schedule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payout schedule updated successfully',
      schedule: {
        enabled: restaurant.payout_schedule_enabled,
        payout_day: restaurant.payout_schedule_day,
        notification_days: restaurant.payout_notification_days
      }
    });

  } catch (error) {
    console.error('Error updating payout schedule:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to update payout schedule'),
      500,
      { request, tenantId: params.id }
    );
  }
}
