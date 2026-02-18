import { createClient } from '@/utils/supabase/server';
import { Tables, TablesInsert, TablesUpdate } from '@/types_db';
import { 
  PayoutCalculation, 
  WaiterPayoutCalculation, 
  GroupPayoutCalculation,
  PayoutData,
  MonthlyPayoutSummary
} from '@/types/payout';

type Payout = Tables<'payouts'>;
type PayoutInsert = TablesInsert<'payouts'>;
type PayoutUpdate = TablesUpdate<'payouts'>;
type Tip = Tables<'tips'>;
type Waiter = Tables<'waiters'>;
type DistributionGroup = Tables<'distribution_groups'>;
type TipDistribution = Tables<'tip_distributions'>;

export interface PayoutCalculationOptions {
  restaurantId: string;
  month: string; // Format: YYYY-MM
  minimumThreshold?: number; // Default 100 KES
}

export interface PayoutProcessingResult {
  success: boolean;
  payoutsCreated: number;
  totalAmount: number;
  errors: string[];
}

export class PayoutService {
  private supabase = createClient();
  private readonly MINIMUM_PAYOUT_THRESHOLD = 100; // 100 KES minimum

  /**
   * Calculate monthly payouts for a restaurant
   * This includes both individual waiter payouts and distribution group payouts
   */
  async calculateMonthlyPayouts(options: PayoutCalculationOptions): Promise<PayoutCalculation> {
    const { restaurantId, month, minimumThreshold = this.MINIMUM_PAYOUT_THRESHOLD } = options;
    
    try {
      // Get date range for the month
      const startDate = `${month}-01`;
      const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
        .toISOString().split('T')[0];

      // Calculate waiter payouts
      const waiterPayouts = await this.calculateWaiterPayouts(restaurantId, startDate, endDate, minimumThreshold);
      
      // Calculate group payouts from restaurant-wide tips
      const groupPayouts = await this.calculateGroupPayouts(restaurantId, startDate, endDate, minimumThreshold);

      // Calculate totals
      const totalWaiterAmount = waiterPayouts.reduce((sum, payout) => sum + payout.net_amount, 0);
      const totalGroupAmount = groupPayouts.reduce((sum, payout) => sum + payout.net_amount, 0);
      const totalCommission = waiterPayouts.reduce((sum, payout) => sum + payout.commission_amount, 0) +
                             groupPayouts.reduce((sum, payout) => sum + payout.commission_amount, 0);

      return {
        waiter_payouts: waiterPayouts,
        group_payouts: groupPayouts,
        total_amount: totalWaiterAmount + totalGroupAmount,
        commission_deducted: totalCommission
      };

    } catch (error) {
      console.error('Error calculating monthly payouts:', error);
      throw new Error('Failed to calculate monthly payouts');
    }
  }

  /**
   * Calculate individual waiter payouts for the month
   * Direct waiter tips go directly to the waiter (not divided by groups)
   */
  private async calculateWaiterPayouts(
    restaurantId: string, 
    startDate: string, 
    endDate: string,
    minimumThreshold: number
  ): Promise<WaiterPayoutCalculation[]> {
    // Get all completed waiter tips for the month
    const { data: waiterTips, error: tipsError } = await this.supabase
      .from('tips')
      .select(`
        id,
        waiter_id,
        amount,
        commission_amount,
        net_amount,
        waiters!inner(id, name, phone_number, is_active)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('tip_type', 'waiter')
      .eq('payment_status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59.999Z')
      .not('waiter_id', 'is', null);

    if (tipsError) {
      console.error('Error fetching waiter tips:', tipsError);
      throw new Error('Failed to fetch waiter tips');
    }

    // Group tips by waiter and calculate totals
    const waiterTotals = new Map<string, {
      waiter: any;
      totalTips: number;
      commissionAmount: number;
      netAmount: number;
      tipCount: number;
    }>();

    (waiterTips || []).forEach((tip: any) => {
      const waiterId = tip.waiter_id;
      const existing = waiterTotals.get(waiterId);
      
      if (existing) {
        existing.totalTips += tip.amount;
        existing.commissionAmount += tip.commission_amount;
        existing.netAmount += tip.net_amount;
        existing.tipCount += 1;
      } else {
        waiterTotals.set(waiterId, {
          waiter: tip.waiters,
          totalTips: tip.amount,
          commissionAmount: tip.commission_amount,
          netAmount: tip.net_amount,
          tipCount: 1
        });
      }
    });

    // Convert to payout calculations
    const payouts: WaiterPayoutCalculation[] = Array.from(waiterTotals.entries()).map(([waiterId, totals]) => ({
      waiter_id: waiterId,
      waiter_name: totals.waiter.name,
      phone_number: totals.waiter.phone_number,
      total_tips: totals.totalTips,
      commission_amount: totals.commissionAmount,
      net_amount: totals.netAmount,
      tip_count: totals.tipCount,
      meets_minimum: totals.netAmount >= minimumThreshold
    }));

    return payouts;
  }

  /**
   * Calculate distribution group payouts from restaurant-wide tips
   * Each group gets their percentage, then it's divided equally among all members in that group
   */
  private async calculateGroupPayouts(
    restaurantId: string,
    startDate: string,
    endDate: string,
    minimumThreshold: number
  ): Promise<GroupPayoutCalculation[]> {
    // Get all tip distributions for restaurant-wide tips in the month
    const { data: distributions, error: distributionsError } = await this.supabase
      .from('tip_distributions')
      .select(`
        group_name,
        percentage,
        amount,
        distribution_group_id,
        tips!inner(
          id,
          amount,
          commission_amount,
          net_amount,
          created_at,
          payment_status
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('tips.payment_status', 'completed')
      .gte('tips.created_at', startDate)
      .lte('tips.created_at', endDate + 'T23:59:59.999Z');

    if (distributionsError) {
      console.error('Error fetching tip distributions:', distributionsError);
      throw new Error('Failed to fetch tip distributions');
    }

    // Get all active waiters with their distribution groups
    const { data: allWaiters, error: waitersError } = await this.supabase
      .from('waiters')
      .select(`
        id,
        name,
        phone_number,
        distribution_group_id,
        distribution_groups(id, group_name, percentage)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .not('distribution_group_id', 'is', null);

    if (waitersError) {
      console.error('Error fetching waiters:', waitersError);
      throw new Error('Failed to fetch waiters');
    }

    // Group by distribution group and calculate totals
    const groupTotals = new Map<string, {
      groupId: string;
      groupName: string;
      percentage: number;
      totalTips: number;
      commissionAmount: number;
      netAmount: number;
    }>();

    (distributions || []).forEach((dist: any) => {
      const groupId = dist.distribution_group_id;
      if (!groupId) return;

      const existing = groupTotals.get(groupId);
      
      // Calculate commission proportionally for this distribution
      const tipCommission = dist.tips.commission_amount;
      const distributionCommission = (tipCommission * dist.percentage) / 100;
      
      if (existing) {
        existing.totalTips += (dist.tips.amount * dist.percentage) / 100;
        existing.commissionAmount += distributionCommission;
        existing.netAmount += dist.amount;
      } else {
        groupTotals.set(groupId, {
          groupId: groupId,
          groupName: dist.group_name,
          percentage: dist.percentage,
          totalTips: (dist.tips.amount * dist.percentage) / 100,
          commissionAmount: distributionCommission,
          netAmount: dist.amount
        });
      }
    });

    const payouts: GroupPayoutCalculation[] = [];

    // For each group, divide the total among all active members
    groupTotals.forEach((groupData) => {
      // Get all active waiters in this group
      const groupMembers = (allWaiters || []).filter(
        (w: any) => w.distribution_group_id === groupData.groupId
      );

      const memberCount = groupMembers.length;
      
      if (memberCount > 0) {
        // Divide the group's total equally among all members
        const amountPerMember = groupData.netAmount / memberCount;
        const tipsPerMember = groupData.totalTips / memberCount;
        const commissionPerMember = groupData.commissionAmount / memberCount;

        groupMembers.forEach((member: any) => {
          payouts.push({
            group_name: `${groupData.groupName} - ${member.name}`,
            percentage: groupData.percentage,
            total_tips: tipsPerMember,
            commission_amount: commissionPerMember,
            net_amount: amountPerMember,
            recipient_account: member.phone_number,
            meets_minimum: amountPerMember >= minimumThreshold,
            waiter_id: member.id,
            waiter_name: member.name
          });
        });
      } else {
        // No members in group - create a single payout record for the group
        payouts.push({
          group_name: groupData.groupName,
          percentage: groupData.percentage,
          total_tips: groupData.totalTips,
          commission_amount: groupData.commissionAmount,
          net_amount: groupData.netAmount,
          recipient_account: null,
          meets_minimum: groupData.netAmount >= minimumThreshold
        });
      }
    });

    return payouts;
  }

  /**
   * Generate payout records for a calculated payout
   * Only creates records for payouts that meet the minimum threshold
   */
  async generatePayoutRecords(
    calculation: PayoutCalculation,
    restaurantId: string,
    month: string
  ): Promise<PayoutProcessingResult> {
    const errors: string[] = [];
    let payoutsCreated = 0;
    let totalAmount = 0;

    try {
      // Create waiter payout records
      for (const waiterPayout of calculation.waiter_payouts) {
        if (waiterPayout.meets_minimum) {
          const payoutData: PayoutInsert = {
            restaurant_id: restaurantId,
            waiter_id: waiterPayout.waiter_id,
            payout_type: 'waiter',
            group_name: null,
            amount: waiterPayout.net_amount,
            payout_month: month,
            status: 'pending',
            recipient_phone: waiterPayout.phone_number,
            recipient_account: null
          };

          const { error } = await this.supabase
            .from('payouts')
            .insert(payoutData);

          if (error) {
            errors.push(`Failed to create waiter payout for ${waiterPayout.waiter_name}: ${error.message}`);
          } else {
            payoutsCreated++;
            totalAmount += waiterPayout.net_amount;
          }
        }
      }

      // Create group payout records
      for (const groupPayout of calculation.group_payouts) {
        if (groupPayout.meets_minimum) {
          const payoutData: PayoutInsert = {
            restaurant_id: restaurantId,
            waiter_id: groupPayout.waiter_id || null, // If divided among members, link to waiter
            payout_type: 'group',
            group_name: groupPayout.group_name,
            amount: groupPayout.net_amount,
            payout_month: month,
            status: 'pending',
            recipient_phone: groupPayout.recipient_account || null, // Phone number if divided among members
            recipient_account: groupPayout.recipient_account
          };

          const { error } = await this.supabase
            .from('payouts')
            .insert(payoutData);

          if (error) {
            errors.push(`Failed to create group payout for ${groupPayout.group_name}: ${error.message}`);
          } else {
            payoutsCreated++;
            totalAmount += groupPayout.net_amount;
          }
        }
      }

      return {
        success: errors.length === 0,
        payoutsCreated,
        totalAmount,
        errors
      };

    } catch (error) {
      console.error('Error generating payout records:', error);
      return {
        success: false,
        payoutsCreated,
        totalAmount,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get existing payouts for a restaurant and month
   */
  async getMonthlyPayouts(restaurantId: string, month: string): Promise<Payout[]> {
    const { data, error } = await this.supabase
      .from('payouts')
      .select(`
        *,
        waiters(id, name, phone_number)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('payout_month', month)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching monthly payouts:', error);
      throw new Error('Failed to fetch monthly payouts');
    }

    return data || [];
  }

  /**
   * Check if payouts have already been generated for a restaurant and month
   */
  async hasPayoutsForMonth(restaurantId: string, month: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('payouts')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('payout_month', month)
      .limit(1);

    if (error) {
      console.error('Error checking existing payouts:', error);
      return false;
    }

    return (data || []).length > 0;
  }

  /**
   * Get monthly payout summary for a restaurant
   */
  async getMonthlyPayoutSummary(restaurantId: string, month: string): Promise<MonthlyPayoutSummary> {
    const payouts = await this.getMonthlyPayouts(restaurantId, month);

    const summary: MonthlyPayoutSummary = {
      month,
      total_payouts: payouts.length,
      total_amount: payouts.reduce((sum, payout) => sum + payout.amount, 0),
      waiter_payouts: payouts.filter(p => p.payout_type === 'waiter').length,
      group_payouts: payouts.filter(p => p.payout_type === 'group').length,
      pending_payouts: payouts.filter(p => p.status === 'pending').length,
      completed_payouts: payouts.filter(p => p.status === 'completed').length,
      failed_payouts: payouts.filter(p => p.status === 'failed').length
    };

    return summary;
  }

  /**
   * Update payout status
   */
  async updatePayoutStatus(
    payoutId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    transactionReference?: string
  ): Promise<void> {
    const updateData: PayoutUpdate = {
      status,
      updated_at: new Date().toISOString()
    };

    if (transactionReference) {
      updateData.transaction_reference = transactionReference;
    }

    if (status === 'completed' || status === 'failed') {
      updateData.processed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('payouts')
      .update(updateData)
      .eq('id', payoutId);

    if (error) {
      console.error('Error updating payout status:', error);
      throw new Error('Failed to update payout status');
    }
  }

  /**
   * Get payouts ready for processing (pending status)
   */
  async getPayoutsForProcessing(restaurantId?: string): Promise<Payout[]> {
    let query = this.supabase
      .from('payouts')
      .select(`
        *,
        waiters(id, name, phone_number)
      `)
      .eq('status', 'pending');

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching payouts for processing:', error);
      throw new Error('Failed to fetch payouts for processing');
    }

    return data || [];
  }

  /**
   * Process monthly payouts for all restaurants
   * This would typically be called by a cron job on the last day of each month
   */
  async processMonthlyPayoutsForAllRestaurants(month?: string): Promise<{
    success: boolean;
    processedRestaurants: number;
    totalPayouts: number;
    totalAmount: number;
    errors: string[];
  }> {
    const targetMonth = month || new Date().toISOString().slice(0, 7); // Current month if not specified
    const errors: string[] = [];
    let processedRestaurants = 0;
    let totalPayouts = 0;
    let totalAmount = 0;

    try {
      // Get all active restaurants
      const { data: restaurants, error: restaurantsError } = await this.supabase
        .from('restaurants')
        .select('id, name')
        .eq('is_active', true);

      if (restaurantsError) {
        throw new Error('Failed to fetch restaurants');
      }

      // Process each restaurant
      for (const restaurant of restaurants || []) {
        try {
          // Check if payouts already exist for this month
          const hasExisting = await this.hasPayoutsForMonth(restaurant.id, targetMonth);
          if (hasExisting) {
            console.log(`Payouts already exist for restaurant ${restaurant.name} for month ${targetMonth}`);
            continue;
          }

          // Calculate payouts
          const calculation = await this.calculateMonthlyPayouts({
            restaurantId: restaurant.id,
            month: targetMonth
          });

          // Generate payout records
          const result = await this.generatePayoutRecords(calculation, restaurant.id, targetMonth);
          
          if (result.success) {
            processedRestaurants++;
            totalPayouts += result.payoutsCreated;
            totalAmount += result.totalAmount;
            console.log(`Generated ${result.payoutsCreated} payouts for ${restaurant.name} (KES ${result.totalAmount})`);
          } else {
            errors.push(`Restaurant ${restaurant.name}: ${result.errors.join(', ')}`);
          }

        } catch (error) {
          const errorMsg = `Restaurant ${restaurant.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        processedRestaurants,
        totalPayouts,
        totalAmount,
        errors
      };

    } catch (error) {
      console.error('Error processing monthly payouts:', error);
      return {
        success: false,
        processedRestaurants,
        totalPayouts,
        totalAmount,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

// Export singleton instance
export const payoutService = new PayoutService();