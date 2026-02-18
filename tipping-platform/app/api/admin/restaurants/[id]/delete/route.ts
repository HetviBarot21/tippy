import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if restaurant exists
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (fetchError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Delete audit logs first to avoid foreign key constraint
    await supabase
      .from('audit_logs')
      .delete()
      .eq('restaurant_id', restaurantId);

    // Delete related records manually in the correct order
    await supabase.from('tips').delete().eq('restaurant_id', restaurantId);
    await supabase.from('payouts').delete().eq('restaurant_id', restaurantId);
    await supabase.from('qr_codes').delete().eq('restaurant_id', restaurantId);
    await supabase.from('waiters').delete().eq('restaurant_id', restaurantId);
    await supabase.from('distribution_groups').delete().eq('restaurant_id', restaurantId);
    await supabase.from('restaurant_admins').delete().eq('restaurant_id', restaurantId);
    
    // Finally delete the restaurant
    const { error: finalDeleteError } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurantId);

    if (finalDeleteError) {
      console.error('Error deleting restaurant:', finalDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete restaurant: ' + finalDeleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Restaurant "${restaurant.name}" deleted successfully`
    });

  } catch (error) {
    console.error('Error in delete restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
