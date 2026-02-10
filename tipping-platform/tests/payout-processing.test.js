import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { payoutProcessor } from '../utils/payouts/processor';
import { payoutService } from '../utils/payouts/service';
import { payoutNotificationService } from '../utils/payouts/notifications';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for tests');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Payout Processing', () => {
  let testRestaurantId;
  let testWaiterId1;
  let testWaiterId2;
  let testTableId;
  let testTipIds = [];
  let testPayoutIds = [];

  beforeAll(async () => {
    // Create test restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: 'Test Payout Processing Restaurant',
        slug: 'test-payout-processing-restaurant',
        email: 'test-processing@example.com',
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

    // Create bank accounts for groups
    await supabase
      .from('bank_accounts')
      .insert([
        {
          restaurant_id: testRestaurantId,
          group_name: 'Waiters',
          account_name: 'Test Waiters Account',
          account_number: '1111111111',
          bank_name: 'Equity Bank',
          bank_code: '068',
          is_active: true
        },
        {
          restaurant_id: testRestaurantId,
          group_name: 'Kitchen',
          account_name: 'Test Kitchen Account',
          account_number: '2222222222',
          bank_name: 'KCB Bank',
          bank_code: '001',
          is_active: true
        }
      ]);
  });

  afterAll(async () => {
    // Clean up test data
    if (testPayoutIds.length > 0) {
      await supabase.from('payouts').delete().in('id', testPayoutIds);
    }
    
    if (testTipIds.length > 0) {
      await supabase.from('tip_distributions').delete().in('tip_id', testTipIds);
      await supabase.from('tips').delete().in('id', testTipIds);
    }
    
    if (testRestaurantId) {
      await supabase.from('bank_accounts').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('distribution_groups').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('qr_codes').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('waiters').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('restaurants').delete().eq('id', testRestaurantId);
    }
  });

  beforeEach(async () => {
    // Clean up payouts and tips before each test
    await supabase.from('payouts').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('tip_distributions').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('tips').delete().eq('restaurant_id', testRestaurantId);
    testTipIds = [];
    testPayoutIds = [];
  });

  describe('End-to-End Payout Processing', () => {
    it('should process complete payout workflow from tips to payouts', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const tipDate = `${currentMonth}-15T12:00:00.000Z`;

      // Step 1: Create tips (waiter and restaurant)
      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .insert([
          // Waiter tips
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId1,
            table_id: testTableId,
            amount: 1000,
            commission_amount: 100,
            net_amount: 900,
            tip_type: 'waiter',
            payment_method: 'mpesa',
            payment_status: 'completed',
            created_at: tipDate
          },
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId2,
            table_id: testTableId,
            amount: 500,
            commission_amount: 50,
            net_amount: 450,
            tip_type: 'waiter',
            payment_method: 'mpesa',
            payment_status: 'completed',
            created_at: tipDate
          },
          // Restaurant tip
          {
            restaurant_id: testRestaurantId,
            waiter_id: null,
            table_id: testTableId,
            amount: 2000,
            commission_amount: 200,
            net_amount: 1800,
            tip_type: 'restaurant',
            payment_method: 'mpesa',
            payment_status: 'completed',
            created_at: tipDate
          }
        ])
        .select();

      if (tipsError) throw tipsError;
      testTipIds.push(...tips.map(t => t.id));

      // Step 2: Create tip distributions for restaurant tip
      const restaurantTip = tips.find(t => t.tip_type === 'restaurant');
      await supabase
        .from('tip_distributions')
        .insert([
          {
            tip_id: restaurantTip.id,
            restaurant_id: testRestaurantId,
            group_name: 'Waiters',
            percentage: 60,
            amount: 1080 // 60% of 1800
          },
          {
            tip_id: restaurantTip.id,
            restaurant_id: testRestaurantId,
            group_name: 'Kitchen',
            percentage: 25,
            amount: 450 // 25% of 1800
          },
          {
            tip_id: restaurantTip.id,
            restaurant_id: testRestaurantId,
            group_name: 'Cleaners',
            percentage: 15,
            amount: 270 // 15% of 1800
          }
        ]);

      // Step 3: Calculate monthly payouts
      const calculation = await payoutService.calculateMonthlyPayouts({
        restaurantId: testRestaurantId,
        month: currentMonth
      });

      expect(calculation.waiter_payouts).toHaveLength(2);
      expect(calculation.group_payouts).toHaveLength(3);

      // Verify waiter calculations
      const waiter1Payout = calculation.waiter_payouts.find(p => p.waiter_id === testWaiterId1);
      expect(waiter1Payout.net_amount).toBe(900);
      expect(waiter1Payout.meets_minimum).toBe(true);

      const waiter2Payout = calculation.waiter_payouts.find(p => p.waiter_id === testWaiterId2);
      expect(waiter2Payout.net_amount).toBe(450);
      expect(waiter2Payout.meets_minimum).toBe(true);

      // Verify group calculations
      const waitersGroup = calculation.group_payouts.find(p => p.group_name === 'Waiters');
      expect(waitersGroup.net_amount).toBe(1080);

      const kitchenGroup = calculation.group_payouts.find(p => p.group_name === 'Kitchen');
      expect(kitchenGroup.net_amount).toBe(450);

      // Step 4: Generate payout records
      const result = await payoutService.generatePayoutRecords(
        calculation,
        testRestaurantId,
        currentMonth
      );

      expect(result.success).toBe(true);
      expect(result.payoutsCreated).toBe(5); // 2 waiters + 3 groups
      expect(result.totalAmount).toBe(3150); // 900 + 450 + 1080 + 450 + 270

      // Step 5: Process payouts (dry run)
      const processingResult = await payoutProcessor.processPayouts({
        restaurantId: testRestaurantId,
        dryRun: true
      });

      expect(processingResult.success).toBe(true);
      expect(processingResult.processed_payouts).toBe(5);
      expect(processingResult.failed_payouts).toBe(0);
      expect(processingResult.waiter_payouts).toBe(2);
      expect(processingResult.group_payouts).toBe(3);

      // Verify payout statuses were updated
      const payouts = await payoutService.getMonthlyPayouts(testRestaurantId, currentMonth);
      expect(payouts).toHaveLength(5);
      expect(payouts.every(p => p.status === 'processing')).toBe(true);
    });

    it('should handle minimum threshold filtering', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const tipDate = `${currentMonth}-15T12:00:00.000Z`;

      // Create small tips that don't meet minimum threshold
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
          },
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId2,
            table_id: testTableId,
            amount: 150,
            commission_amount: 15,
            net_amount: 135, // Above minimum
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

      expect(calculation.waiter_payouts).toHaveLength(2);

      const waiter1Payout = calculation.waiter_payouts.find(p => p.waiter_id === testWaiterId1);
      expect(waiter1Payout.meets_minimum).toBe(false);

      const waiter2Payout = calculation.waiter_payouts.find(p => p.waiter_id === testWaiterId2);
      expect(waiter2Payout.meets_minimum).toBe(true);

      // Generate payout records (should only create for waiter2)
      const result = await payoutService.generatePayoutRecords(
        calculation,
        testRestaurantId,
        currentMonth
      );

      expect(result.success).toBe(true);
      expect(result.payoutsCreated).toBe(1); // Only waiter2
      expect(result.totalAmount).toBe(135);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing bank accounts for group payouts', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Remove bank account for Cleaners group
      await supabase
        .from('bank_accounts')
        .delete()
        .eq('restaurant_id', testRestaurantId)
        .eq('group_name', 'Cleaners');

      // Create payout for Cleaners group
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          restaurant_id: testRestaurantId,
          waiter_id: null,
          payout_type: 'group',
          group_name: 'Cleaners',
          amount: 200,
          payout_month: currentMonth,
          status: 'pending'
        })
        .select()
        .single();

      if (payoutError) throw payoutError;
      testPayoutIds.push(payout.id);

      // Process payouts (should fail for Cleaners)
      const result = await payoutProcessor.processPayouts({
        restaurantId: testRestaurantId,
        dryRun: false
      });

      expect(result.success).toBe(false);
      expect(result.failed_payouts).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('No bank account configured');
    });

    it('should handle waiter payout failures gracefully', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Create payout for waiter with invalid phone number
      const { data: waiter, error: waiterError } = await supabase
        .from('waiters')
        .insert({
          restaurant_id: testRestaurantId,
          name: 'Invalid Phone Waiter',
          phone_number: 'invalid-phone',
          is_active: true
        })
        .select()
        .single();

      if (waiterError) throw waiterError;

      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          restaurant_id: testRestaurantId,
          waiter_id: waiter.id,
          payout_type: 'waiter',
          amount: 500,
          payout_month: currentMonth,
          status: 'pending',
          recipient_phone: 'invalid-phone'
        })
        .select()
        .single();

      if (payoutError) throw payoutError;
      testPayoutIds.push(payout.id);

      // Process payouts (should handle invalid phone gracefully)
      const result = await payoutProcessor.processPayouts({
        restaurantId: testRestaurantId,
        dryRun: false
      });

      // In dry run mode, this should still succeed
      // In live mode with real M-Pesa, this would fail
      expect(result.total_payouts).toBe(1);
    });

    it('should handle database connection errors', async () => {
      // Test with invalid restaurant ID
      const result = await payoutProcessor.processPayouts({
        restaurantId: 'invalid-restaurant-id',
        dryRun: true
      });

      expect(result.success).toBe(true); // No payouts to process
      expect(result.total_payouts).toBe(0);
    });

    it('should handle concurrent payout processing', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Create multiple payouts
      const { data: payouts, error: payoutsError } = await supabase
        .from('payouts')
        .insert([
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId1,
            payout_type: 'waiter',
            amount: 300,
            payout_month: currentMonth,
            status: 'pending'
          },
          {
            restaurant_id: testRestaurantId,
            waiter_id: testWaiterId2,
            payout_type: 'waiter',
            amount: 400,
            payout_month: currentMonth,
            status: 'pending'
          }
        ])
        .select();

      if (payoutsError) throw payoutsError;
      testPayoutIds.push(...payouts.map(p => p.id));

      // Process payouts concurrently
      const [result1, result2] = await Promise.all([
        payoutProcessor.processPayouts({
          restaurantId: testRestaurantId,
          dryRun: true
        }),
        payoutProcessor.processPayouts({
          restaurantId: testRestaurantId,
          dryRun: true
        })
      ]);

      // Both should complete, but only one should process the payouts
      expect(result1.success || result2.success).toBe(true);
      
      // Check that payouts were processed (status changed from pending)
      const updatedPayouts = await supabase
        .from('payouts')
        .select('*')
        .in('id', testPayoutIds);

      expect(updatedPayouts.data.some(p => p.status !== 'pending')).toBe(true);
    });
  });

  describe('Retry Mechanisms', () => {
    it('should retry failed payouts successfully', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Create payout and mark as failed
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId1,
          payout_type: 'waiter',
          amount: 500,
          payout_month: currentMonth,
          status: 'failed'
        })
        .select()
        .single();

      if (payoutError) throw payoutError;
      testPayoutIds.push(payout.id);

      // Retry the failed payout
      const result = await payoutProcessor.retryFailedPayouts([payout.id], true);

      expect(result.success).toBe(true);
      expect(result.processed_payouts).toBe(1);
      expect(result.failed_payouts).toBe(0);

      // Verify payout status was reset and processed
      const { data: updatedPayout } = await supabase
        .from('payouts')
        .select('*')
        .eq('id', payout.id)
        .single();

      expect(updatedPayout.status).toBe('processing');
    });
  });

  describe('Notification Integration', () => {
    it('should send notifications during payout processing', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Create payout
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId1,
          payout_type: 'waiter',
          amount: 500,
          payout_month: currentMonth,
          status: 'pending'
        })
        .select()
        .single();

      if (payoutError) throw payoutError;
      testPayoutIds.push(payout.id);

      // Test upcoming notification
      const upcomingResult = await payoutNotificationService.sendUpcomingPayoutNotification(payout);
      expect(Array.isArray(upcomingResult)).toBe(true);

      // Test processed notification
      const processedResult = await payoutNotificationService.sendProcessedPayoutNotification(payout);
      expect(Array.isArray(processedResult)).toBe(true);

      // Test failed notification
      const failedResult = await payoutNotificationService.sendFailedPayoutNotification(payout);
      expect(Array.isArray(failedResult)).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of payouts efficiently', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const startTime = Date.now();

      // Create multiple payouts (simulate large restaurant)
      const payoutData = Array.from({ length: 50 }, (_, i) => ({
        restaurant_id: testRestaurantId,
        waiter_id: i % 2 === 0 ? testWaiterId1 : testWaiterId2,
        payout_type: 'waiter',
        amount: 100 + (i * 10),
        payout_month: currentMonth,
        status: 'pending'
      }));

      const { data: payouts, error: payoutsError } = await supabase
        .from('payouts')
        .insert(payoutData)
        .select();

      if (payoutsError) throw payoutsError;
      testPayoutIds.push(...payouts.map(p => p.id));

      // Process all payouts
      const result = await payoutProcessor.processPayouts({
        restaurantId: testRestaurantId,
        dryRun: true
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.processed_payouts).toBe(50);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Processed ${result.processed_payouts} payouts in ${processingTime}ms`);
    });
  });
});