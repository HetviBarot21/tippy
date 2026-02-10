import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { payoutService } from '../utils/payouts/service';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for tests');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Payout Calculations', () => {
  let testRestaurantId;
  let testWaiterId1;
  let testWaiterId2;
  let testTableId;
  let testTipIds = [];

  beforeAll(async () => {
    // Create test restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: 'Test Payout Restaurant',
        slug: 'test-payout-restaurant',
        email: 'test-payout@example.com',
        commission_rate: 10.0
      })
      .select()
      .single();

    if (restaurantError) throw restaurantError;
    testRestaurantId = restaurant.id;

    // Create test waiters
    const { data: waiters, error: waitersError } = await supabase
      .from('waiters')
      .insert([
        {
          restaurant_id: testRestaurantId,
          name: 'Test Waiter 1',
          phone_number: '+254700000001',
          is_active: true
        },
        {
          restaurant_id: testRestaurantId,
          name: 'Test Waiter 2',
          phone_number: '+254700000002',
          is_active: true
        }
      ])
      .select();

    if (waitersError) throw waitersError;
    testWaiterId1 = waiters[0].id;
    testWaiterId2 = waiters[1].id;

    // Create test QR code/table
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .insert({
        restaurant_id: testRestaurantId,
        table_number: 'T1',
        qr_data: 'test-qr-data',
        is_active: true
      })
      .select()
      .single();

    if (qrError) throw qrError;
    testTableId = qrCode.id;

    // Create distribution groups
    await supabase
      .from('distribution_groups')
      .insert([
        { restaurant_id: testRestaurantId, group_name: 'Waiters', percentage: 60 },
        { restaurant_id: testRestaurantId, group_name: 'Kitchen', percentage: 25 },
        { restaurant_id: testRestaurantId, group_name: 'Cleaners', percentage: 15 }
      ]);
  });

  afterAll(async () => {
    // Clean up test data
    if (testTipIds.length > 0) {
      await supabase.from('tip_distributions').delete().in('tip_id', testTipIds);
      await supabase.from('tips').delete().in('id', testTipIds);
    }
    
    if (testRestaurantId) {
      await supabase.from('payouts').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('distribution_groups').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('qr_codes').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('waiters').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('restaurants').delete().eq('id', testRestaurantId);
    }
  });

  beforeEach(async () => {
    // Clean up any existing payouts before each test
    await supabase.from('payouts').delete().eq('restaurant_id', testRestaurantId);
  });

  describe('Waiter Payout Calculations', () => {
    it('should calculate waiter payouts correctly', async () => {
      // Create test tips for waiters
      const currentMonth = new Date().toISOString().slice(0, 7);
      const tipDate = `${currentMonth}-15T12:00:00.000Z`;

      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .insert([
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId1,
            table_id: testTableId,
            amount: 500,
            commission_amount: 50,
            net_amount: 450,
            tip_type: 'waiter',
            payment_method: 'mpesa',
            payment_status: 'completed',
            created_at: tipDate
          },
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId1,
            table_id: testTableId,
            amount: 300,
            commission_amount: 30,
            net_amount: 270,
            tip_type: 'waiter',
            payment_method: 'mpesa',
            payment_status: 'completed',
            created_at: tipDate
          },
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId2,
            table_id: testTableId,
            amount: 200,
            commission_amount: 20,
            net_amount: 180,
            tip_type: 'waiter',
            payment_method: 'mpesa',
            payment_status: 'completed',
            created_at: tipDate
          }
        ])
        .select();

      if (tipsError) throw tipsError;
      testTipIds.push(...tips.map(t => t.id));

      // Calculate payouts
      const calculation = await payoutService.calculateMonthlyPayouts({
        restaurantId: testRestaurantId,
        month: currentMonth
      });

      // Verify waiter payouts
      expect(calculation.waiter_payouts).toHaveLength(2);

      const waiter1Payout = calculation.waiter_payouts.find(p => p.waiter_id === testWaiterId1);
      expect(waiter1Payout).toBeDefined();
      expect(waiter1Payout.total_tips).toBe(800); // 500 + 300
      expect(waiter1Payout.commission_amount).toBe(80); // 50 + 30
      expect(waiter1Payout.net_amount).toBe(720); // 450 + 270
      expect(waiter1Payout.tip_count).toBe(2);
      expect(waiter1Payout.meets_minimum).toBe(true);

      const waiter2Payout = calculation.waiter_payouts.find(p => p.waiter_id === testWaiterId2);
      expect(waiter2Payout).toBeDefined();
      expect(waiter2Payout.total_tips).toBe(200);
      expect(waiter2Payout.commission_amount).toBe(20);
      expect(waiter2Payout.net_amount).toBe(180);
      expect(waiter2Payout.tip_count).toBe(1);
      expect(waiter2Payout.meets_minimum).toBe(true);
    });

    it('should handle minimum threshold correctly', async () => {
      // Create a small tip that doesn't meet minimum threshold
      const currentMonth = new Date().toISOString().slice(0, 7);
      const tipDate = `${currentMonth}-15T12:00:00.000Z`;

      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .insert([
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId1,
            table_id: testTableId,
            amount: 50,
            commission_amount: 5,
            net_amount: 45, // Below 100 KES minimum
            tip_type: 'waiter',
            payment_method: 'mpesa',
            payment_status: 'completed',
            created_at: tipDate
          }
        ])
        .select();

      if (tipsError) throw tipsError;
      testTipIds.push(...tips.map(t => t.id));

      // Calculate payouts
      const calculation = await payoutService.calculateMonthlyPayouts({
        restaurantId: testRestaurantId,
        month: currentMonth
      });

      // Verify waiter payout doesn't meet minimum
      expect(calculation.waiter_payouts).toHaveLength(1);
      const waiterPayout = calculation.waiter_payouts[0];
      expect(waiterPayout.net_amount).toBe(45);
      expect(waiterPayout.meets_minimum).toBe(false);
    });
  });

  describe('Group Payout Calculations', () => {
    it('should calculate group payouts from restaurant tips', async () => {
      // Create restaurant-wide tips
      const currentMonth = new Date().toISOString().slice(0, 7);
      const tipDate = `${currentMonth}-15T12:00:00.000Z`;

      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .insert([
          {
            restaurant_id: testRestaurantId,
            waiter_id: null,
            table_id: testTableId,
            amount: 1000,
            commission_amount: 100,
            net_amount: 900,
            tip_type: 'restaurant',
            payment_method: 'mpesa',
            payment_status: 'completed',
            created_at: tipDate
          }
        ])
        .select();

      if (tipsError) throw tipsError;
      testTipIds.push(...tips.map(t => t.id));

      // Create tip distributions
      await supabase
        .from('tip_distributions')
        .insert([
          {
            tip_id: tips[0].id,
            restaurant_id: testRestaurantId,
            group_name: 'Waiters',
            percentage: 60,
            amount: 540 // 60% of 900
          },
          {
            tip_id: tips[0].id,
            restaurant_id: testRestaurantId,
            group_name: 'Kitchen',
            percentage: 25,
            amount: 225 // 25% of 900
          },
          {
            tip_id: tips[0].id,
            restaurant_id: testRestaurantId,
            group_name: 'Cleaners',
            percentage: 15,
            amount: 135 // 15% of 900
          }
        ]);

      // Calculate payouts
      const calculation = await payoutService.calculateMonthlyPayouts({
        restaurantId: testRestaurantId,
        month: currentMonth
      });

      // Verify group payouts
      expect(calculation.group_payouts).toHaveLength(3);

      const waitersGroup = calculation.group_payouts.find(p => p.group_name === 'Waiters');
      expect(waitersGroup).toBeDefined();
      expect(waitersGroup.net_amount).toBe(540);
      expect(waitersGroup.meets_minimum).toBe(true);

      const kitchenGroup = calculation.group_payouts.find(p => p.group_name === 'Kitchen');
      expect(kitchenGroup).toBeDefined();
      expect(kitchenGroup.net_amount).toBe(225);
      expect(kitchenGroup.meets_minimum).toBe(true);

      const cleanersGroup = calculation.group_payouts.find(p => p.group_name === 'Cleaners');
      expect(cleanersGroup).toBeDefined();
      expect(cleanersGroup.net_amount).toBe(135);
      expect(cleanersGroup.meets_minimum).toBe(true);
    });
  });

  describe('Payout Record Generation', () => {
    it('should generate payout records correctly', async () => {
      // Create test tips
      const currentMonth = new Date().toISOString().slice(0, 7);
      const tipDate = `${currentMonth}-15T12:00:00.000Z`;

      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .insert([
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId1,
            table_id: testTableId,
            amount: 500,
            commission_amount: 50,
            net_amount: 450,
            tip_type: 'waiter',
            payment_method: 'mpesa',
            payment_status: 'completed',
            created_at: tipDate
          }
        ])
        .select();

      if (tipsError) throw tipsError;
      testTipIds.push(...tips.map(t => t.id));

      // Calculate payouts
      const calculation = await payoutService.calculateMonthlyPayouts({
        restaurantId: testRestaurantId,
        month: currentMonth
      });

      // Generate payout records
      const result = await payoutService.generatePayoutRecords(
        calculation,
        testRestaurantId,
        currentMonth
      );

      expect(result.success).toBe(true);
      expect(result.payoutsCreated).toBe(1);
      expect(result.totalAmount).toBe(450);

      // Verify payout record was created
      const payouts = await payoutService.getMonthlyPayouts(testRestaurantId, currentMonth);
      expect(payouts).toHaveLength(1);
      expect(payouts[0].amount).toBe(450);
      expect(payouts[0].payout_type).toBe('waiter');
      expect(payouts[0].status).toBe('pending');
    });

    it('should not create duplicate payouts for same month', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Create first payout
      await supabase
        .from('payouts')
        .insert({
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId1,
          payout_type: 'waiter',
          amount: 100,
          payout_month: currentMonth,
          status: 'pending'
        });

      // Check if payouts exist
      const hasExisting = await payoutService.hasPayoutsForMonth(testRestaurantId, currentMonth);
      expect(hasExisting).toBe(true);
    });
  });

  describe('Monthly Payout Summary', () => {
    it('should generate correct monthly summary', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Create test payouts
      await supabase
        .from('payouts')
        .insert([
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId1,
            payout_type: 'waiter',
            amount: 450,
            payout_month: currentMonth,
            status: 'pending'
          },
          {
            restaurant_id: testRestaurantId,
            waiter_id: null,
            payout_type: 'group',
            group_name: 'Kitchen',
            amount: 225,
            payout_month: currentMonth,
            status: 'completed'
          }
        ]);

      // Get summary
      const summary = await payoutService.getMonthlyPayoutSummary(testRestaurantId, currentMonth);

      expect(summary.month).toBe(currentMonth);
      expect(summary.total_payouts).toBe(2);
      expect(summary.total_amount).toBe(675);
      expect(summary.waiter_payouts).toBe(1);
      expect(summary.group_payouts).toBe(1);
      expect(summary.pending_payouts).toBe(1);
      expect(summary.completed_payouts).toBe(1);
      expect(summary.failed_payouts).toBe(0);
    });
  });
});