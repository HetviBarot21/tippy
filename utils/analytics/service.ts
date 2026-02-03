/**
 * Analytics Service
 * 
 * Provides analytics and reporting functionality for tips and payouts
 */

'use server';

import { createClient } from '@/utils/supabase/server';
import type { TipAnalytics, MonthlyTipSummary } from '@/types/tip';

/**
 * Get tip analytics for a restaurant
 */
export async function getRestaurantTipAnalytics(
  restaurantId: string,
  startDate?: string,
  endDate?: string
): Promise<TipAnalytics | null> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('tips')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('payment_status', 'completed');
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    const { data: tips, error } = await query;
    
    if (error || !tips) {
      console.error('Error fetching tip analytics:', error);
      return null;
    }
    
    // Calculate analytics
    const totalAmount = tips.reduce((sum, tip) => sum + tip.amount, 0);
    const totalTips = tips.length;
    const averageTip = totalTips > 0 ? totalAmount / totalTips : 0;
    const commissionEarned = tips.reduce((sum, tip) => sum + tip.commission_amount, 0);
    const netAmount = tips.reduce((sum, tip) => sum + tip.net_amount, 0);
    
    // Group by payment method
    const byPaymentMethod = tips.reduce((acc, tip) => {
      acc[tip.payment_method] = (acc[tip.payment_method] || 0) + tip.amount;
      return acc;
    }, { mpesa: 0, card: 0 });
    
    // Group by tip type
    const byTipType = tips.reduce((acc, tip) => {
      acc[tip.tip_type] = (acc[tip.tip_type] || 0) + tip.amount;
      return acc;
    }, { waiter: 0, restaurant: 0 });
    
    return {
      total_amount: totalAmount,
      total_tips: totalTips,
      average_tip: Math.round(averageTip * 100) / 100,
      commission_earned: commissionEarned,
      net_amount: netAmount,
      by_payment_method: byPaymentMethod,
      by_tip_type: byTipType
    };
    
  } catch (error) {
    console.error('Analytics service error:', error);
    return null;
  }
}

/**
 * Get monthly tip summary for a restaurant
 */
export async function getMonthlyTipSummary(
  restaurantId: string,
  year: number,
  month: number
): Promise<MonthlyTipSummary | null> {
  try {
    const supabase = createClient();
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const { data: tips, error } = await supabase
      .from('tips')
      .select('amount, commission_amount, net_amount')
      .eq('restaurant_id', restaurantId)
      .eq('payment_status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (error || !tips) {
      console.error('Error fetching monthly summary:', error);
      return null;
    }
    
    const totalAmount = tips.reduce((sum, tip) => sum + tip.amount, 0);
    const commissionAmount = tips.reduce((sum, tip) => sum + tip.commission_amount, 0);
    const netAmount = tips.reduce((sum, tip) => sum + tip.net_amount, 0);
    
    return {
      month: `${year}-${month.toString().padStart(2, '0')}`,
      total_amount: totalAmount,
      tip_count: tips.length,
      commission_amount: commissionAmount,
      net_amount: netAmount
    };
    
  } catch (error) {
    console.error('Monthly summary service error:', error);
    return null;
  }
}

/**
 * Get waiter tip analytics
 */
export async function getWaiterTipAnalytics(
  waiterId: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('tips')
      .select('*')
      .eq('waiter_id', waiterId)
      .eq('payment_status', 'completed');
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    const { data: tips, error } = await query;
    
    if (error || !tips) {
      console.error('Error fetching waiter analytics:', error);
      return null;
    }
    
    const totalAmount = tips.reduce((sum, tip) => sum + tip.amount, 0);
    const netAmount = tips.reduce((sum, tip) => sum + tip.net_amount, 0);
    
    return {
      total_tips: tips.length,
      total_amount: totalAmount,
      net_amount: netAmount,
      average_tip: tips.length > 0 ? totalAmount / tips.length : 0
    };
    
  } catch (error) {
    console.error('Waiter analytics service error:', error);
    return null;
  }
}