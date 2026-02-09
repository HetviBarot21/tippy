/**
 * Payout Calculation Service
 * 
 * Handles monthly payout calculations for waiters and distribution groups
 * with proper tenant isolation and commission deduction
 */

'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import type { 
  PayoutCalculation, 
  WaiterPayoutCalculation, 
  GroupPayoutCalculation,
  PayoutInsert 
} from '@/types/payout';

export interface PayoutCalculationRequest {
  restaurant_id: string;
  month: string; // Format: YYYY-MM
}

export interface PayoutCalculationResult {
  success: boolean;
  data?: PayoutCalculation;
  message: string;
}

const MINIMUM_PAYOUT_THRESHOLD = 100; // 100 KES minimum

/**
 * Calculate monthly payouts for a restaurant
 */
export async function calculateMonthlyPayouts(
  request: PayoutCalculationRequest
): Promise<PayoutCalculationResult> {
  try {
    const supabase = createClient();
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(request.month)) {
      return {
        success: false,
        message: 'Invalid month format. Use YYYY-MM'
      };
    }

    // Get month date range
    const startDate = `${request.month}-01`;
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
      .toISOString().split('T')[0];

    // Calculate waiter payouts
    const waiterPayouts = await calculateWaiterPayouts(
      supabase,
      request.restaurant_id,
      startDate,
      endDate
    );

    // Calculate group payouts
    const groupPayouts = await calculateGroupPayouts(
      supabase,
      request.restaurant_id,
      startDate,
      endDate
    );

    // Calculate totals
    const totalAmount = waiterPayouts.reduce((sum, p) => sum + p.net_amount, 0) +
                      groupPayouts.reduce((sum, p) => sum + p.net_amount, 0);
    
    const commissionDeducted = waiterPayouts.reduce((sum, p) => sum + p.commission_amount, 0) +
                              groupPayouts.reduce((sum, p) => sum + p.commission_amount, 0);

    return {
      success: true,
      data: {
        waiter_payouts: waiterPayouts,
        group_payouts: groupPayouts,
        total_amount: totalAmount,
        commission_deducted: commissionDeducted
      },
      message: 'Payout calculation completed successfully'
    };

  } catch (error) {
    console.error('Payout calculation error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Payout calculation failed'
    };
  }
}

/**
 * Calculate waiter payouts for the month
 */
async function calculateWaiterPayouts(
  supabase: any,
  restaurantId: string,
  startDate: string,
  endDate: string
): Promise<WaiterPayoutCalculation[]> {
  // Get all waiter tips for the month
  const { data: waiterTips, error } = await supabase
    .from('tips')
    .select(`
      waiter_id,
      amount,
      commission_amount,
      net_amount,
      waiter:waiters(name, phone_number)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('tip_type', 'waiter')
    .eq('payment_status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59.999Z')
    .not('waiter_id', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch waiter tips: ${error.message}`);
  }

  // Group tips by waiter
  const waiterTipGroups = waiterTips.reduce((groups: any, tip: any) => {
    const waiterId = tip.waiter_id;
    if (!groups[waiterId]) {
      groups[waiterId] = {
        waiter_id: waiterId,
        waiter_name: tip.waiter.name,
        phone_number: tip.waiter.phone_number,
        tips: []
      };
    }
    groups[waiterId].tips.push(tip);
    return groups;
  }, {});

  // Calculate payout amounts for each waiter
  return Object.values(waiterTipGroups).map((group: any) => {
    const totalTips = group.tips.reduce((sum: number, tip: any) => sum + tip.amount, 0);
    const commissionAmount = group.tips.reduce((sum: number, tip: any) => sum + tip.commission_amount, 0);
    const netAmount = group.tips.reduce((sum: number, tip: any) => sum + tip.net_amount, 0);
    
    return {
      waiter_id: group.waiter_id,
      waiter_name: group.waiter_name,
      phone_number: group.phone_number,
      total_tips: totalTips,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      tip_count: group.tips.length,
      meets_minimum: netAmount >= MINIMUM_PAYOUT_THRESHOLD
    };
  });
}

/**
 * Calculate group payouts for restaurant-wide tips
 */
async function calculateGroupPayouts(
  supabase: any,
  restaurantId: string,
  startDate: string,
  endDate: string
): Promise<GroupPayoutCalculation[]> {
  // Get restaurant-wide tips for the month
  const { data: restaurantTips, error: tipsError } = await supabase
    .from('tips')
    .select('amount, commission_amount, net_amount')
    .eq('restaurant_id', restaurantId)
    .eq('tip_type', 'restaurant')
    .eq('payment_status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59.999Z');

  if (tipsError) {
    throw new Error(`Failed to fetch restaurant tips: ${tipsError.message}`);
  }

  // Get distribution groups for the restaurant
  const { data: distributionGroups, error: groupsError } = await supabase
    .from('distribution_groups')
    .select('group_name, percentage, recipient_account')
    .eq('restaurant_id', restaurantId);

  if (groupsError) {
    throw new Error(`Failed to fetch distribution groups: ${groupsError.message}`);
  }

  if (!distributionGroups || distributionGroups.length === 0) {
    return [];
  }

  // Calculate total restaurant tips
  const totalRestaurantTips = restaurantTips.reduce((sum: number, tip: any) => sum + tip.amount, 0);
  const totalCommission = restaurantTips.reduce((sum: number, tip: any) => sum + tip.commission_amount, 0);
  const totalNetAmount = restaurantTips.reduce((sum: number, tip: any) => sum + tip.net_amount, 0);

  // Calculate payout for each distribution group
  return distributionGroups.map((group: any) => {
    const groupTips = (totalRestaurantTips * group.percentage) / 100;
    const groupCommission = (totalCommission * group.percentage) / 100;
    const groupNetAmount = (totalNetAmount * group.percentage) / 100;

    return {
      group_name: group.group_name,
      percentage: group.percentage,
      total_tips: groupTips,
      commission_amount: groupCommission,
      net_amount: groupNetAmount,
      recipient_account: group.recipient_account,
      meets_minimum: groupNetAmount >= MINIMUM_PAYOUT_THRESHOLD
    };
  });
}

/**
 * Generate payout records from calculations
 */
export async function generatePayoutRecords(
  restaurantId: string,
  month: string,
  calculation: PayoutCalculation
): Promise<{ success: boolean; message: string; payout_ids?: string[] }> {
  try {
    const adminSupabase = createAdminClient();
    const payoutRecords: PayoutInsert[] = [];
    const payoutMonth = `${month}-01`; // First day of the month

    // Generate waiter payout records
    for (const waiterPayout of calculation.waiter_payouts) {
      if (waiterPayout.meets_minimum) {
        payoutRecords.push({
          restaurant_id: restaurantId,
          waiter_id: waiterPayout.waiter_id,
          payout_type: 'waiter',
          group_name: null,
          amount: waiterPayout.net_amount,
          payout_month: payoutMonth,
          recipient_phone: waiterPayout.phone_number,
          recipient_account: null,
          status: 'pending'
        });
      }
    }

    // Generate group payout records
    for (const groupPayout of calculation.group_payouts) {
      if (groupPayout.meets_minimum) {
        payoutRecords.push({
          restaurant_id: restaurantId,
          waiter_id: null,
          payout_type: 'group',
          group_name: groupPayout.group_name,
          amount: groupPayout.net_amount,
          payout_month: payoutMonth,
          recipient_phone: null,
          recipient_account: groupPayout.recipient_account,
          status: 'pending'
        });
      }
    }

    if (payoutRecords.length === 0) {
      return {
        success: true,
        message: 'No payouts meet minimum threshold',
        payout_ids: []
      };
    }

    // Insert payout records
    const { data: insertedPayouts, error } = await adminSupabase
      .from('payouts')
      .insert(payoutRecords)
      .select('id');

    if (error) {
      throw new Error(`Failed to create payout records: ${error.message}`);
    }

    return {
      success: true,
      message: `Generated ${insertedPayouts.length} payout records`,
      payout_ids: insertedPayouts.map(p => p.id)
    };

  } catch (error) {
    console.error('Generate payout records error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate payout records'
    };
  }
}

/**
 * Get existing payouts for a month to avoid duplicates
 */
export async function getExistingPayouts(
  restaurantId: string,
  month: string
): Promise<{ success: boolean; payouts?: any[]; message: string }> {
  try {
    const supabase = createClient();
    const payoutMonth = `${month}-01`;

    const { data: payouts, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('payout_month', payoutMonth);

    if (error) {
      throw new Error(`Failed to fetch existing payouts: ${error.message}`);
    }

    return {
      success: true,
      payouts: payouts || [],
      message: 'Existing payouts retrieved successfully'
    };

  } catch (error) {
    console.error('Get existing payouts error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch existing payouts'
    };
  }
}