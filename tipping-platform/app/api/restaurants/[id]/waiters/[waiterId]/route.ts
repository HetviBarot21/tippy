import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; waiterId: string } }
) {
  try {
    const restaurantId = params.id;
    const waiterId = params.waiterId;

    const supabase = createClient();

    // Get waiter details with tip history
    const { data: waiter, error } = await supabase
      .from('waiters')
      .select(`
        *,
        tips (
          id,
          amount,
          net_amount,
          commission_amount,
          created_at,
          payment_status,
          payment_method,
          qr_codes (table_number)
        )
      `)
      .eq('id', waiterId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !waiter) {
      return NextResponse.json({ error: 'Waiter not found' }, { status: 404 });
    }

    // Calculate detailed statistics
    const completedTips = waiter.tips?.filter(tip => tip.payment_status === 'completed') || [];
    const totalTips = completedTips.length;
    const totalAmount = completedTips.reduce((sum, tip) => sum + tip.net_amount, 0);
    const totalCommission = completedTips.reduce((sum, tip) => sum + tip.commission_amount, 0);

    // Monthly breakdown for the last 6 months
    const monthlyBreakdown = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = monthDate.toISOString().slice(0, 7);
      const monthTips = completedTips.filter(tip => tip.created_at.startsWith(monthStr));
      const monthAmount = monthTips.reduce((sum, tip) => sum + tip.net_amount, 0);
      
      monthlyBreakdown.push({
        month: monthStr,
        monthName: monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        tipCount: monthTips.length,
        amount: monthAmount
      });
    }

    // Payment method breakdown
    const paymentMethodBreakdown = completedTips.reduce((acc, tip) => {
      if (!acc[tip.payment_method]) {
        acc[tip.payment_method] = { count: 0, amount: 0 };
      }
      acc[tip.payment_method].count++;
      acc[tip.payment_method].amount += tip.net_amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    return NextResponse.json({
      waiter: {
        ...waiter,
        tips: undefined // Remove tips array from main object
      },
      stats: {
        totalTips,
        totalAmount,
        totalCommission,
        monthlyBreakdown,
        paymentMethodBreakdown
      },
      recentTips: completedTips.slice(0, 10)
    });

  } catch (error) {
    console.error('Error fetching waiter details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waiter details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; waiterId: string } }
) {
  try {
    const restaurantId = params.id;
    const waiterId = params.waiterId;
    const body = await request.json();
    
    const { name, phone_number, email, profile_photo_url, is_active } = body;

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

    const supabase = createClient();

    // Check if phone number already exists for another waiter in this restaurant
    const { data: existingWaiter } = await supabase
      .from('waiters')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('phone_number', phone_number)
      .neq('id', waiterId)
      .single();

    if (existingWaiter) {
      return NextResponse.json(
        { error: 'Another waiter with this phone number already exists' },
        { status: 400 }
      );
    }

    // Update waiter
    const { data: waiter, error } = await supabase
      .from('waiters')
      .update({
        name,
        phone_number,
        email: email || null,
        profile_photo_url: profile_photo_url || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', waiterId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating waiter:', error);
      return NextResponse.json({ error: 'Failed to update waiter' }, { status: 500 });
    }

    if (!waiter) {
      return NextResponse.json({ error: 'Waiter not found' }, { status: 404 });
    }

    return NextResponse.json({ waiter });

  } catch (error) {
    console.error('Error updating waiter:', error);
    return NextResponse.json(
      { error: 'Failed to update waiter' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; waiterId: string } }
) {
  try {
    const restaurantId = params.id;
    const waiterId = params.waiterId;

    const supabase = createClient();

    // Instead of deleting, we deactivate the waiter to preserve tip history
    const { data: waiter, error } = await supabase
      .from('waiters')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', waiterId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating waiter:', error);
      return NextResponse.json({ error: 'Failed to deactivate waiter' }, { status: 500 });
    }

    if (!waiter) {
      return NextResponse.json({ error: 'Waiter not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Waiter deactivated successfully', waiter });

  } catch (error) {
    console.error('Error deactivating waiter:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate waiter' },
      { status: 500 }
    );
  }
}