import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/utils/auth/api-helpers';

export const GET = withSuperAdmin(async (context, request: NextRequest) => {
  try {
    const { supabase } = context;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // month, week, year

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Get comprehensive analytics
    const [
      { data: restaurants },
      { data: tips },
      { data: waiters },
      { data: payouts },
      { data: recentTips }
    ] = await Promise.all([
      // Restaurant statistics
      supabase
        .from('restaurants')
        .select('id, name, is_active, created_at, commission_rate'),
      
      // Tip statistics for the period
      supabase
        .from('tips')
        .select('amount, commission_amount, payment_status, created_at, restaurant_id')
        .gte('created_at', startDate.toISOString()),
      
      // Waiter statistics
      supabase
        .from('waiters')
        .select('id, restaurant_id, is_active, created_at'),
      
      // Payout statistics
      supabase
        .from('payouts')
        .select('amount, status, payout_type, created_at, restaurant_id')
        .gte('created_at', startDate.toISOString()),
      
      // Recent tips for trend analysis
      supabase
        .from('tips')
        .select('amount, created_at, restaurant_id')
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    // Calculate metrics
    const completedTips = tips?.filter(tip => tip.payment_status === 'completed') || [];
    const totalTips = completedTips.reduce((sum, tip) => sum + tip.amount, 0);
    const totalCommissions = completedTips.reduce((sum, tip) => sum + tip.commission_amount, 0);
    
    const activeRestaurants = restaurants?.filter(r => r.is_active) || [];
    const activeWaiters = waiters?.filter(w => w.is_active) || [];
    
    // Calculate growth metrics
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    
    const { data: previousTips } = await supabase
      .from('tips')
      .select('amount, commission_amount')
      .eq('payment_status', 'completed')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString());

    const previousTotal = previousTips?.reduce((sum, tip) => sum + tip.amount, 0) || 0;
    const growthRate = previousTotal > 0 ? ((totalTips - previousTotal) / previousTotal * 100) : 0;

    // Restaurant performance breakdown
    const restaurantPerformance = activeRestaurants.map(restaurant => {
      const restaurantTips = completedTips.filter(tip => tip.restaurant_id === restaurant.id);
      const restaurantWaiters = activeWaiters.filter(w => w.restaurant_id === restaurant.id);
      
      return {
        id: restaurant.id,
        name: restaurant.name,
        totalTips: restaurantTips.reduce((sum, tip) => sum + tip.amount, 0),
        tipCount: restaurantTips.length,
        commissionEarned: restaurantTips.reduce((sum, tip) => sum + tip.commission_amount, 0),
        waiterCount: restaurantWaiters.length,
        commissionRate: restaurant.commission_rate
      };
    }).sort((a, b) => b.totalTips - a.totalTips);

    // Daily trend data for charts
    const dailyTrends = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayTips = completedTips.filter(tip => {
        const tipDate = new Date(tip.created_at);
        return tipDate >= dayStart && tipDate <= dayEnd;
      });
      
      dailyTrends.push({
        date: dayStart.toISOString().split('T')[0],
        tips: dayTips.reduce((sum, tip) => sum + tip.amount, 0),
        count: dayTips.length,
        commission: dayTips.reduce((sum, tip) => sum + tip.commission_amount, 0)
      });
    }

    const analytics = {
      period,
      summary: {
        totalRestaurants: restaurants?.length || 0,
        activeRestaurants: activeRestaurants.length,
        totalWaiters: waiters?.length || 0,
        activeWaiters: activeWaiters.length,
        totalTips,
        tipCount: completedTips.length,
        totalCommissions,
        averageTipAmount: completedTips.length > 0 ? totalTips / completedTips.length : 0,
        averageCommissionRate: totalTips > 0 ? (totalCommissions / totalTips * 100) : 0,
        growthRate
      },
      restaurantPerformance: restaurantPerformance.slice(0, 10), // Top 10
      dailyTrends,
      payoutSummary: {
        totalPayouts: payouts?.reduce((sum, payout) => sum + payout.amount, 0) || 0,
        pendingPayouts: payouts?.filter(p => p.status === 'pending').length || 0,
        completedPayouts: payouts?.filter(p => p.status === 'completed').length || 0
      }
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching system analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});