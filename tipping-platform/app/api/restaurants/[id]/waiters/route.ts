import { NextRequest, NextResponse } from 'next/server';
import { validateApiTenantAccess, createErrorResponse } from '@/utils/auth/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Validate tenant access and get context
    const context = await validateApiTenantAccess(request, restaurantId);
    const { supabase } = context;

    let query = supabase
      .from('waiters')
      .select(`
        *,
        tips!inner(
          id,
          amount,
          net_amount,
          created_at,
          payment_status
        )
      `)
      .eq('restaurant_id', restaurantId);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: waiters, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching waiters:', error);
      return NextResponse.json({ error: 'Failed to fetch waiters' }, { status: 500 });
    }

    // Calculate tip statistics for each waiter
    const waitersWithStats = waiters?.map(waiter => {
      const waiterTips = waiter.tips?.filter(tip => tip.payment_status === 'completed') || [];
      const totalTips = waiterTips.length;
      const totalAmount = waiterTips.reduce((sum, tip) => sum + tip.net_amount, 0);
      const thisMonthTips = waiterTips.filter(tip => {
        const tipDate = new Date(tip.created_at);
        const now = new Date();
        return tipDate.getMonth() === now.getMonth() && tipDate.getFullYear() === now.getFullYear();
      });
      const thisMonthAmount = thisMonthTips.reduce((sum, tip) => sum + tip.net_amount, 0);

      return {
        ...waiter,
        stats: {
          totalTips,
          totalAmount,
          thisMonthTips: thisMonthTips.length,
          thisMonthAmount
        },
        tips: undefined // Remove tips array from response to keep it clean
      };
    }) || [];

    return NextResponse.json({ waiters: waitersWithStats });

  } catch (error) {
    console.error('Error fetching waiters:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to fetch waiters'),
      error instanceof Error && error.message.includes('Access denied') ? 403 : 500,
      { request, tenantId: params.id }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const body = await request.json();
    
    // Validate tenant access and get context
    const context = await validateApiTenantAccess(request, restaurantId);
    const { supabase } = context;
    
    const { name, phone_number, email, profile_photo_url } = body;

    // Validate required fields
    if (!name || !phone_number) {
      return NextResponse.json(
        { error: 'Name and phone number are required' },
        { status: 400 }
      );
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(phone_number.replace(/\s+/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use Kenyan format (e.g., 0712345678)' },
        { status: 400 }
      );
    }

    // Check if phone number already exists for this restaurant
    const { data: existingWaiter } = await supabase
      .from('waiters')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('phone_number', phone_number)
      .single();

    if (existingWaiter) {
      return NextResponse.json(
        { error: 'A waiter with this phone number already exists' },
        { status: 400 }
      );
    }

    // Create new waiter
    const { data: waiter, error } = await supabase
      .from('waiters')
      .insert({
        restaurant_id: restaurantId,
        name,
        phone_number,
        email: email || null,
        profile_photo_url: profile_photo_url || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating waiter:', error);
      return NextResponse.json({ error: 'Failed to create waiter' }, { status: 500 });
    }

    return NextResponse.json({ waiter }, { status: 201 });

  } catch (error) {
    console.error('Error creating waiter:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to create waiter'),
      error instanceof Error && error.message.includes('Access denied') ? 403 : 500,
      { request, tenantId: params.id }
    );
  }
}