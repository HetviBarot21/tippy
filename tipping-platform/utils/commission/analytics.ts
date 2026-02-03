/**
 * Commission Analytics Service
 * Provides comprehensive commission tracking and reporting for YourappsLtd
 */

import { createClient } from '@supabase/supabase-js';

// Use service role client to bypass RLS for admin operations
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export interface CommissionSummary {
  totalCommissions: number;
  totalTips: number;
  averageCommissionRate: number;
  tipCount: number;
  restaurantCount: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface RestaurantCommissionReport {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  commissionRate: number;
  totalCommissions: number;
  totalTips: number;
  tipCount: number;
  averageTipAmount: number;
  lastTipDate: string | null;
}

export interface CommissionTrend {
  date: string;
  totalCommissions: number;
  totalTips: number;
  tipCount: number;
  averageCommissionRate: number;
}

export interface PaymentMethodBreakdown {
  paymentMethod: 'card' | 'mpesa';
  totalCommissions: number;
  totalTips: number;
  tipCount: number;
  averageCommissionRate: number;
}

export interface CommissionReconciliation {
  restaurantId: string;
  restaurantName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalTipsReceived: number;
  totalCommissionsCalculated: number;
  totalCommissionsPaid: number;
  outstandingCommissions: number;
  reconciliationStatus: 'balanced' | 'discrepancy' | 'pending';
}

export class CommissionAnalyticsService {
  private getSupabase() {
    return createServiceClient();
  }

  /**
   * Get overall commission summary for YourappsLtd
   */
  async getCommissionSummary(startDate: string, endDate: string): Promise<CommissionSummary> {
    const supabase = this.getSupabase();

    // Get all completed tips in the period
    const { data: tips, error } = await supabase
      .from('tips')
      .select('amount, commission_amount, restaurant_id')
      .eq('payment_status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      console.error('Error fetching commission summary:', error);
      throw new Error('Failed to fetch commission summary');
    }

    const totalCommissions = (tips || []).reduce((sum, tip) => sum + (tip.commission_amount || 0), 0);
    const totalTips = (tips || []).reduce((sum, tip) => sum + (tip.amount || 0), 0);
    const tipCount = (tips || []).length;
    
    // Get unique restaurant count
    const uniqueRestaurants = new Set((tips || []).map(tip => tip.restaurant_id));
    const restaurantCount = uniqueRestaurants.size;

    // Calculate average commission rate weighted by tip amounts
    const averageCommissionRate = totalTips > 0 
      ? Math.round((totalCommissions / totalTips) * 100 * 100) / 100
      : 0;

    return {
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      totalTips: Math.round(totalTips * 100) / 100,
      averageCommissionRate,
      tipCount,
      restaurantCount,
      period: {
        startDate,
        endDate
      }
    };
  }

  /**
   * Get commission report by restaurant
   */
  async getRestaurantCommissionReport(
    startDate: string, 
    endDate: string,
    limit?: number
  ): Promise<RestaurantCommissionReport[]> {
    const supabase = this.getSupabase();

    // Get tips with restaurant information
    const { data: tipsWithRestaurants, error } = await supabase
      .from('tips')
      .select(`
        amount,
        commission_amount,
        created_at,
        restaurants!inner (
          id,
          name,
          slug,
          commission_rate
        )
      `)
      .eq('payment_status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching restaurant commission report:', error);
      throw new Error('Failed to fetch restaurant commission report');
    }

    // Group by restaurant and calculate metrics
    const restaurantMap = new Map<string, {
      restaurant: any;
      tips: any[];
    }>();

    (tipsWithRestaurants || []).forEach((tip: any) => {
      const restaurantId = tip.restaurants.id;
      if (!restaurantMap.has(restaurantId)) {
        restaurantMap.set(restaurantId, {
          restaurant: tip.restaurants,
          tips: []
        });
      }
      restaurantMap.get(restaurantId)!.tips.push(tip);
    });

    // Calculate metrics for each restaurant
    const reports: RestaurantCommissionReport[] = Array.from(restaurantMap.entries()).map(([restaurantId, data]) => {
      const { restaurant, tips } = data;
      
      const totalCommissions = tips.reduce((sum, tip) => sum + (tip.commission_amount || 0), 0);
      const totalTips = tips.reduce((sum, tip) => sum + (tip.amount || 0), 0);
      const tipCount = tips.length;
      const averageTipAmount = tipCount > 0 ? totalTips / tipCount : 0;
      const lastTipDate = tips.length > 0 ? tips[0].created_at : null;

      return {
        restaurantId,
        restaurantName: restaurant.name,
        restaurantSlug: restaurant.slug,
        commissionRate: restaurant.commission_rate || 10.0,
        totalCommissions: Math.round(totalCommissions * 100) / 100,
        totalTips: Math.round(totalTips * 100) / 100,
        tipCount,
        averageTipAmount: Math.round(averageTipAmount * 100) / 100,
        lastTipDate
      };
    });

    // Sort by total commissions (highest first) and apply limit
    reports.sort((a, b) => b.totalCommissions - a.totalCommissions);
    
    return limit ? reports.slice(0, limit) : reports;
  }

  /**
   * Get commission trends over time
   */
  async getCommissionTrends(
    startDate: string, 
    endDate: string, 
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<CommissionTrend[]> {
    const supabase = this.getSupabase();

    // Build date truncation based on interval
    const dateTrunc = interval === 'day' ? 'day' : 
                     interval === 'week' ? 'week' : 'month';

    const { data: trends, error } = await supabase.rpc('get_commission_trends', {
      start_date: startDate,
      end_date: endDate,
      date_interval: dateTrunc
    });

    if (error) {
      console.error('Error fetching commission trends:', error);
      // Fallback to manual calculation if RPC function doesn't exist
      return this.calculateCommissionTrendsManually(startDate, endDate, interval);
    }

    return trends || [];
  }

  /**
   * Fallback method to calculate commission trends manually
   */
  private async calculateCommissionTrendsManually(
    startDate: string, 
    endDate: string, 
    interval: 'day' | 'week' | 'month'
  ): Promise<CommissionTrend[]> {
    const supabase = this.getSupabase();

    const { data: tips, error } = await supabase
      .from('tips')
      .select('amount, commission_amount, created_at')
      .eq('payment_status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at');

    if (error) {
      console.error('Error fetching tips for trends:', error);
      return [];
    }

    // Group tips by date interval
    const trendMap = new Map<string, {
      totalCommissions: number;
      totalTips: number;
      tipCount: number;
    }>();

    (tips || []).forEach(tip => {
      const date = new Date(tip.created_at);
      let key: string;

      if (interval === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (interval === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }

      if (!trendMap.has(key)) {
        trendMap.set(key, {
          totalCommissions: 0,
          totalTips: 0,
          tipCount: 0
        });
      }

      const trend = trendMap.get(key)!;
      trend.totalCommissions += tip.commission_amount || 0;
      trend.totalTips += tip.amount || 0;
      trend.tipCount += 1;
    });

    // Convert to array and calculate average commission rates
    return Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      totalCommissions: Math.round(data.totalCommissions * 100) / 100,
      totalTips: Math.round(data.totalTips * 100) / 100,
      tipCount: data.tipCount,
      averageCommissionRate: data.totalTips > 0 
        ? Math.round((data.totalCommissions / data.totalTips) * 100 * 100) / 100
        : 0
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get commission breakdown by payment method
   */
  async getPaymentMethodBreakdown(startDate: string, endDate: string): Promise<PaymentMethodBreakdown[]> {
    const supabase = this.getSupabase();

    const { data: tips, error } = await supabase
      .from('tips')
      .select('amount, commission_amount, payment_method')
      .eq('payment_status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      console.error('Error fetching payment method breakdown:', error);
      throw new Error('Failed to fetch payment method breakdown');
    }

    // Group by payment method
    const methodMap = new Map<string, {
      totalCommissions: number;
      totalTips: number;
      tipCount: number;
    }>();

    (tips || []).forEach(tip => {
      const method = tip.payment_method as 'card' | 'mpesa';
      if (!methodMap.has(method)) {
        methodMap.set(method, {
          totalCommissions: 0,
          totalTips: 0,
          tipCount: 0
        });
      }

      const data = methodMap.get(method)!;
      data.totalCommissions += tip.commission_amount || 0;
      data.totalTips += tip.amount || 0;
      data.tipCount += 1;
    });

    return Array.from(methodMap.entries()).map(([method, data]) => ({
      paymentMethod: method as 'card' | 'mpesa',
      totalCommissions: Math.round(data.totalCommissions * 100) / 100,
      totalTips: Math.round(data.totalTips * 100) / 100,
      tipCount: data.tipCount,
      averageCommissionRate: data.totalTips > 0 
        ? Math.round((data.totalCommissions / data.totalTips) * 100 * 100) / 100
        : 0
    }));
  }

  /**
   * Generate commission reconciliation report
   */
  async getCommissionReconciliation(
    startDate: string, 
    endDate: string
  ): Promise<CommissionReconciliation[]> {
    const supabase = this.getSupabase();

    // Get all restaurants with their tips in the period
    const { data: restaurantsWithTips, error } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        tips!inner (
          amount,
          commission_amount,
          payment_status
        )
      `)
      .gte('tips.created_at', startDate)
      .lte('tips.created_at', endDate);

    if (error) {
      console.error('Error fetching reconciliation data:', error);
      throw new Error('Failed to fetch commission reconciliation data');
    }

    return (restaurantsWithTips || []).map((restaurant: any) => {
      const completedTips = restaurant.tips.filter((tip: any) => tip.payment_status === 'completed');
      
      const totalTipsReceived = completedTips.reduce((sum: number, tip: any) => sum + (tip.amount || 0), 0);
      const totalCommissionsCalculated = completedTips.reduce((sum: number, tip: any) => sum + (tip.commission_amount || 0), 0);
      
      // For now, assume all calculated commissions are paid (would need payout tracking)
      const totalCommissionsPaid = totalCommissionsCalculated;
      const outstandingCommissions = totalCommissionsCalculated - totalCommissionsPaid;

      const reconciliationStatus: 'balanced' | 'discrepancy' | 'pending' = 
        outstandingCommissions === 0 ? 'balanced' : 
        outstandingCommissions > 0 ? 'pending' : 'discrepancy';

      return {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        period: {
          startDate,
          endDate
        },
        totalTipsReceived: Math.round(totalTipsReceived * 100) / 100,
        totalCommissionsCalculated: Math.round(totalCommissionsCalculated * 100) / 100,
        totalCommissionsPaid: Math.round(totalCommissionsPaid * 100) / 100,
        outstandingCommissions: Math.round(outstandingCommissions * 100) / 100,
        reconciliationStatus
      };
    });
  }
}

// Export singleton instance
export const commissionAnalyticsService = new CommissionAnalyticsService();