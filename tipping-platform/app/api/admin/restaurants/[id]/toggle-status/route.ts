import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/utils/auth/api-helpers';

export const POST = withSuperAdmin(async (context, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const restaurantId = params.id;
    const { supabase } = context;

    // Get current restaurant status
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('is_active, name')
      .eq('id', restaurantId)
      .single();

    if (fetchError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Toggle the status
    const newStatus = !restaurant.is_active;

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ is_active: newStatus })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Error updating restaurant status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update restaurant status' },
        { status: 500 }
      );
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: context.userId,
      restaurant_id: restaurantId,
      table_name: 'restaurants',
      action: newStatus ? 'activate' : 'deactivate',
      record_id: restaurantId,
      new_values: {
        restaurant_name: restaurant.name,
        new_status: newStatus,
        changed_by: context.userId,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      restaurant: {
        id: restaurantId,
        name: restaurant.name,
        is_active: newStatus
      }
    });

  } catch (error) {
    console.error('Error toggling restaurant status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});