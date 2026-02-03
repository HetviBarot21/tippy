/**
 * Commission Management Service
 * Handles commission rate configuration, calculation, and audit logging
 */

import { createClient } from '@supabase/supabase-js';
import { Tables, TablesInsert, TablesUpdate } from '@/types_db';

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

export interface CommissionRateHistory {
  id: string;
  restaurant_id: string;
  old_rate: number | null;
  new_rate: number;
  changed_by: string | null;
  changed_at: string;
  reason?: string;
}

export interface CommissionCalculation {
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
}

export interface CommissionAnalytics {
  restaurantId: string;
  totalCommissions: number;
  totalTips: number;
  averageCommissionRate: number;
  tipCount: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export class CommissionService {
  private getSupabase() {
    return createServiceClient();
  }

  /**
   * Get commission rate for a restaurant
   */
  async getCommissionRate(restaurantId: string): Promise<number> {
    const supabase = this.getSupabase();
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('commission_rate')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      throw new Error('Restaurant not found');
    }

    return (restaurant as any).commission_rate || 10.0; // Default 10%
  }

  /**
   * Update commission rate for a restaurant with audit logging
   */
  async updateCommissionRate(
    restaurantId: string, 
    newRate: number, 
    changedBy?: string,
    reason?: string
  ): Promise<void> {
    // Validate commission rate
    if (typeof newRate !== 'number' || newRate < 0 || newRate > 50) {
      throw new Error('Commission rate must be between 0% and 50%');
    }

    const supabase = this.getSupabase();

    // Get current rate for audit log
    const currentRate = await this.getCommissionRate(restaurantId);

    // Update restaurant commission rate
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ 
        commission_rate: newRate,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Error updating commission rate:', updateError);
      throw new Error('Failed to update commission rate');
    }

    // Create audit log entry
    await this.logCommissionRateChange(
      restaurantId,
      currentRate,
      newRate,
      changedBy,
      reason
    );
  }

  /**
   * Log commission rate changes for audit trail
   */
  private async logCommissionRateChange(
    restaurantId: string,
    oldRate: number,
    newRate: number,
    changedBy?: string,
    reason?: string
  ): Promise<void> {
    const supabase = this.getSupabase();

    const auditData = {
      restaurant_id: restaurantId,
      table_name: 'restaurants',
      record_id: restaurantId,
      action: 'UPDATE',
      old_values: { commission_rate: oldRate },
      new_values: { commission_rate: newRate, change_reason: reason },
      user_id: changedBy || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert(auditData);

    if (error) {
      console.error('Error logging commission rate change:', error);
      // Don't throw error here as the main operation succeeded
    }
  }

  /**
   * Calculate commission with proper decimal precision
   */
  calculateCommission(amount: number, commissionRate: number): CommissionCalculation {
    // Ensure consistent decimal precision (2 decimal places)
    const commissionAmount = Math.round((amount * commissionRate) / 100 * 100) / 100;
    const netAmount = Math.round((amount - commissionAmount) * 100) / 100;

    return {
      amount,
      commissionRate,
      commissionAmount,
      netAmount
    };
  }

  /**
   * Get commission rate history for a restaurant
   */
  async getCommissionRateHistory(restaurantId: string): Promise<CommissionRateHistory[]> {
    const supabase = this.getSupabase();
    
    const { data: auditLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('table_name', 'restaurants')
      .contains('new_values', { commission_rate: null })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching commission rate history:', error);
      return [];
    }

    return (auditLogs || []).map((log: any) => ({
      id: log.id,
      restaurant_id: log.restaurant_id,
      old_rate: log.old_values?.commission_rate || null,
      new_rate: log.new_values?.commission_rate || 10.0,
      changed_by: log.user_id,
      changed_at: log.created_at,
      reason: log.new_values?.change_reason
    }));
  }

  /**
   * Get commission analytics for a restaurant
   */
  async getCommissionAnalytics(
    restaurantId: string,
    startDate: string,
    endDate: string
  ): Promise<CommissionAnalytics> {
    const supabase = this.getSupabase();

    const { data: tips, error } = await supabase
      .from('tips')
      .select('amount, commission_amount, commission_rate')
      .eq('restaurant_id', restaurantId)
      .eq('payment_status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      console.error('Error fetching commission analytics:', error);
      throw new Error('Failed to fetch commission analytics');
    }

    const totalCommissions = (tips || []).reduce((sum, tip) => sum + (tip.commission_amount || 0), 0);
    const totalTips = (tips || []).reduce((sum, tip) => sum + (tip.amount || 0), 0);
    const tipCount = (tips || []).length;
    
    // Calculate average commission rate weighted by tip amounts
    const averageCommissionRate = totalTips > 0 
      ? Math.round((totalCommissions / totalTips) * 100 * 100) / 100
      : 0;

    return {
      restaurantId,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      totalTips: Math.round(totalTips * 100) / 100,
      averageCommissionRate,
      tipCount,
      period: {
        startDate,
        endDate
      }
    };
  }

  /**
   * Get all restaurants with their commission rates (for YourappsLtd admin)
   */
  async getAllRestaurantCommissionRates(): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    commission_rate: number;
    is_active: boolean;
    created_at: string;
  }>> {
    const supabase = this.getSupabase();

    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, commission_rate, is_active, created_at')
      .order('name');

    if (error) {
      console.error('Error fetching restaurant commission rates:', error);
      throw new Error('Failed to fetch restaurant commission rates');
    }

    return restaurants || [];
  }

  /**
   * Bulk update commission rates for multiple restaurants
   */
  async bulkUpdateCommissionRates(
    updates: Array<{ restaurantId: string; newRate: number }>,
    changedBy?: string,
    reason?: string
  ): Promise<void> {
    const supabase = this.getSupabase();

    // Process updates in transaction-like manner
    for (const update of updates) {
      try {
        await this.updateCommissionRate(
          update.restaurantId,
          update.newRate,
          changedBy,
          reason
        );
      } catch (error) {
        console.error(`Failed to update commission rate for restaurant ${update.restaurantId}:`, error);
        throw new Error(`Bulk update failed for restaurant ${update.restaurantId}`);
      }
    }
  }

  /**
   * Validate commission rate value
   */
  validateCommissionRate(rate: number): { isValid: boolean; error?: string } {
    if (typeof rate !== 'number') {
      return { isValid: false, error: 'Commission rate must be a number' };
    }

    if (rate < 0) {
      return { isValid: false, error: 'Commission rate cannot be negative' };
    }

    if (rate > 50) {
      return { isValid: false, error: 'Commission rate cannot exceed 50%' };
    }

    // Check for reasonable decimal precision (max 2 decimal places)
    if (Math.round(rate * 100) / 100 !== rate) {
      return { isValid: false, error: 'Commission rate can have at most 2 decimal places' };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const commissionService = new CommissionService();