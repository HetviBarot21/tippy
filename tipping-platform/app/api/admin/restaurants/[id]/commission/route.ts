import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/tenant-client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super admin
    const isSuperAdmin = user.email && (
      user.email.endsWith('@yourapps.co.ke') || 
      user.email.endsWith('@yourappsltd.com') ||
      ['admin@tippy.co.ke', 'support@tippy.co.ke'].includes(user.email)
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { commission_rate } = body;

    // Validate commission rate
    if (typeof commission_rate !== 'number' || commission_rate < 0 || commission_rate > 100) {
      return NextResponse.json(
        { error: 'Invalid commission rate. Must be between 0 and 100.' },
        { status: 400 }
      );
    }

    // Update restaurant commission rate
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update({ 
        commission_rate,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating commission rate:', error);
      return NextResponse.json(
        { error: 'Failed to update commission rate' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant
    });

  } catch (error) {
    console.error('Commission rate update API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
