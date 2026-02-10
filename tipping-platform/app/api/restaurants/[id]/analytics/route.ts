import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // YYYY-MM format
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    
    const supabase = createClient();

    // Get current month analytics
    const currentMonthStart = `${month}-01`;
    const currentMonthEnd = new Date(new Date(currentMonthStart).getFullYear(), new Date(currentMonthStart).getMonth() + 1, 0).toISOString().slice(0, 10);

    // Fetch tips for the specified month
    const { data: tips, error: tipsError } = await supabase
      .from('tips')
      .select(`
        *,
        waiters (id, name),
        qr_codes (table_number)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('payment_status', 'completed')
      .gte('created_at', currentMonthStart)
      .lte('created_at', currentMonthEnd + 'T23:59:59.999Z')
      .order('created_at', { ascending: false });

    if (tipsError) {
      console.error('Error fetching tips:', tipsError);
      return NextResponse.json({ error: 'Failed to fetch tips' }, { status: 500 });
    }

    // Fetch waiters for the restaurant
    const { data: waiters, error: waitersError } = await supabase
      .from('waiters')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    if (waitersError) {
      console.error('Error fetching waiters:', waitersError);
      return NextResponse.json({ error: 'Failed to fetch waiters' }, { status: 500 });
    }

    // Fetch distribution groups
    const { data: distributionGroups, error: distributionError } = await supabase
      .from('distribution_groups')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (distributionError) {
      console.error('Error fetching distribution groups:', distributionError);
      return NextResponse.json({ error: 'Failed to fetch distribution groups' }, { status: 500 });
    }

    // Calculate analytics
    const totalTips = tips?.length || 0;
    const totalAmount = tips?.reduce((sum, tip) => sum + tip.amount, 0) || 0;
    const totalCommission = tips?.reduce((sum, tip) => sum + tip.commission_amount, 0) || 0;
    const totalNetAmount = tips?.reduce((sum, tip) => sum + tip.net_amount, 0) || 0;

    // Group tips by waiter
    const waiterTips = waiters?.map(waiter => {
      const waiterTipsList = tips?.filter(tip => tip.waiter_id === waiter.id) || [];
      const waiterTotal = waiterTipsList.reduce((sum, tip) => sum + tip.net_amount, 0);
      const waiterCount = waiterTipsList.length;
      
      return {
        waiter,
        totalAmount: waiterTotal,
        tipCount: waiterCount,
        tips: waiterTipsList
      };
    }) || [];

    // Calculate restaurant-wide tips (tips without specific waiter)
    const restaurantTips = tips?.filter(tip => tip.tip_type === 'restaurant') || [];
    const restaurantTotalAmount = restaurantTips.reduce((sum, tip) => sum + tip.net_amount, 0);

    // Calculate distribution breakdown for restaurant tips
    const distributionBreakdown = distributionGroups?.map(group => {
      const groupAmount = (restaurantTotalAmount * group.percentage) / 100;
      return {
        groupName: group.group_name,
        percentage: group.percentage,
        amount: groupAmount
      };
    }) || [];

    // Group by payment method
    const paymentMethodBreakdown = tips?.reduce((acc, tip) => {
      if (!acc[tip.payment_method]) {
        acc[tip.payment_method] = { count: 0, amount: 0 };
      }
      acc[tip.payment_method].count++;
      acc[tip.payment_method].amount += tip.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>) || {};

    // Daily breakdown for the month
    const dailyBreakdown = [];
    const daysInMonth = new Date(new Date(currentMonthStart).getFullYear(), new Date(currentMonthStart).getMonth() + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${month}-${day.toString().padStart(2, '0')}`;
      const dayTips = tips?.filter(tip => tip.created_at?.startsWith(dayStr)) || [];
      const dayAmount = dayTips.reduce((sum, tip) => sum + tip.net_amount, 0);
      
      dailyBreakdown.push({
        date: dayStr,
        amount: dayAmount,
        count: dayTips.length
      });
    }

    return NextResponse.json({
      month,
      summary: {
        totalTips,
        totalAmount,
        totalCommission,
        totalNetAmount,
        restaurantTipsAmount: restaurantTotalAmount,
        waiterTipsAmount: totalNetAmount - restaurantTotalAmount
      },
      waiterBreakdown: waiterTips,
      distributionBreakdown,
      paymentMethodBreakdown,
      dailyBreakdown,
      recentTips: tips?.slice(0, 10) || []
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}