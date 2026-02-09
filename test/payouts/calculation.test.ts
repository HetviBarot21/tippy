/**
 * Payout Calculation Tests
 * 
 * Tests for monthly payout calculations with various scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calculateMonthlyPayouts, generatePayoutRecords } from '@/utils/payouts/service';
import { createClient } from '@/utils/supabase/server';

describe('Payout Calculation Service', () => {
  const testRestaurantId = 'test-restaurant-id';
  const testMonth = '2024-01';
  
  beforeEach(async () => {
    // Setup test data
    const supabase = createClient();
    
    // Create test restaurant
    await supabase.from('restaurants').insert({
      id: testRestaurantId,
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      commission_rate: 10.00
    });

    // Create test waiters
    await supabase.from('waiters').insert([
      {
        id: 'waiter-1',
        restaurant_id: testRestaurantId,
        name: 'John Doe',
        phone_number: '254712345678',
        is_active: true
      },
      {
        id: 'waiter-2',
        restaurant_id: testRestaurantId,
        name: 'Jane Smith',
        phone_number: '254712345679',
        is_active: true
      }
    ]);

    // Create distribution groups
    await supabase.from('distribution_groups').insert([
      {
        restaurant_id: testRestaurantId,
        group_name: 'cleaners',
        percentage: 10.00
      },
      {
        restaurant_id: testRestaurantId,
        group_name: 'waiters',
        percentage: 30.00
      },
      {
        restaurant_id: testRestaurantId,
        group_name: 'admin',
        percentage: 40.00
      },
      {
        restaurant_id: testRestaurantId,
        group_name: 'owners',
        percentage: 20.00
      }
    ]);
  });

  afterEach(async () => {
    // Cleanup test data
    const supabase = createClient();
    await supabase.from('tips').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('payouts').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('distribution_groups').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('waiters').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('restaurants').delete().eq('id', testRestaurantId);
  });

  it('should calculate waiter payouts correctly', async () => {
    const supabase = createClient();
    
    // Create test tips for waiters
    await supabase.from('tips').insert([
      {
        restaurant_id: testRestaurantId,
        waiter_id: 'waiter-1',
        amount: 1000.00,
        commission_amount: 100.00,
        net_amount: 900.00,
        tip_type: 'waiter',
        payment_status: 'completed',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        restaurant_id: testRestaurantId,
        waiter_id: 'waiter-1',
        amount: 500.00,
        commission_amount: 50.00,
        net_amount: 450.00,
        tip_type: 'waiter',
        payment_status: 'completed',
        created_at: '2024-01-20T10:00:00Z'
      },
      {
        restaurant_id: testRestaurantId,
        waiter_id: 'waiter-2',
        amount: 200.00,
        commission_amount: 20.00,
        net_amount: 180.00,
        tip_type: 'waiter',
        payment_status: 'completed',
        created_at: '2024-01-25T10:00:00Z'
      }
    ]);

    const result = await calculateMonthlyPayouts({
      restaurant_id: testRestaurantId,
      month: testMonth
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    const { waiter_payouts } = result.data!;
    expect(waiter_payouts).toHaveLength(2);

    // Check waiter-1 payout
    const waiter1Payout = waiter_payouts.find(p => p.waiter_id === 'waiter-1');
    expect(waiter1Payout).toBeDefined();
    expect(waiter1Payout!.total_tips).toBe(1500.00);
    expect(waiter1Payout!.commission_amount).toBe(150.00);
    expect(waiter1Payout!.net_amount).toBe(1350.00);
    expect(waiter1Payout!.tip_count).toBe(2);
    expect(waiter1Payout!.meets_minimum).toBe(true);

    // Check waiter-2 payout
    const waiter2Payout = waiter_payouts.find(p => p.waiter_id === 'waiter-2');
    expect(waiter2Payout).toBeDefined();
    expect(waiter2Payout!.total_tips).toBe(200.00);
    expect(waiter2Payout!.commission_amount).toBe(20.00);
    expect(waiter2Payout!.net_amount).toBe(180.00);
    expect(waiter2Payout!.tip_count).toBe(1);
    expect(waiter2Payout!.meets_minimum).toBe(true);
  });

  it('should calculate group payouts correctly', async () => {
    const supabase = createClient();
    
    // Create test restaurant-wide tips
    await supabase.from('tips').insert([
      {
        restaurant_id: testRestaurantId,
        waiter_id: null,
        amount: 2000.00,
        commission_amount: 200.00,
        net_amount: 1800.00,
        tip_type: 'restaurant',
        payment_status: 'completed',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        restaurant_id: testRestaurantId,
        waiter_id: null,
        amount: 1000.00,
        commission_amount: 100.00,
        net_amount: 900.00,
        tip_type: 'restaurant',
        payment_status: 'completed',
        created_at: '2024-01-20T10:00:00Z'
      }
    ]);

    const result = await calculateMonthlyPayouts({
      restaurant_id: testRestaurantId,
      month: testMonth
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    const { group_payouts } = result.data!;
    expect(group_payouts).toHaveLength(4);

    // Total restaurant tips: 3000, commission: 300, net: 2700
    const cleanersPayout = group_payouts.find(p => p.group_name === 'cleaners');
    expect(cleanersPayout).toBeDefined();
    expect(cleanersPayout!.percentage).toBe(10.00);
    expect(cleanersPayout!.total_tips).toBe(300.00); // 10% of 3000
    expect(cleanersPayout!.commission_amount).toBe(30.00); // 10% of 300
    expect(cleanersPayout!.net_amount).toBe(270.00); // 10% of 2700
    expect(cleanersPayout!.meets_minimum).toBe(true);

    const adminPayout = group_payouts.find(p => p.group_name === 'admin');
    expect(adminPayout).toBeDefined();
    expect(adminPayout!.percentage).toBe(40.00);
    expect(adminPayout!.total_tips).toBe(1200.00); // 40% of 3000
    expect(adminPayout!.commission_amount).toBe(120.00); // 40% of 300
    expect(adminPayout!.net_amount).toBe(1080.00); // 40% of 2700
    expect(adminPayout!.meets_minimum).toBe(true);
  });

  it('should handle minimum payout threshold correctly', async () => {
    const supabase = createClient();
    
    // Create small tip that doesn't meet minimum threshold
    await supabase.from('tips').insert({
      restaurant_id: testRestaurantId,
      waiter_id: 'waiter-1',
      amount: 50.00,
      commission_amount: 5.00,
      net_amount: 45.00,
      tip_type: 'waiter',
      payment_status: 'completed',
      created_at: '2024-01-15T10:00:00Z'
    });

    const result = await calculateMonthlyPayouts({
      restaurant_id: testRestaurantId,
      month: testMonth
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    const { waiter_payouts } = result.data!;
    expect(waiter_payouts).toHaveLength(1);
    
    const waiterPayout = waiter_payouts[0];
    expect(waiterPayout.net_amount).toBe(45.00);
    expect(waiterPayout.meets_minimum).toBe(false); // Below 100 KES threshold
  });

  it('should generate payout records correctly', async () => {
    const supabase = createClient();
    
    // Create test tips
    await supabase.from('tips').insert([
      {
        restaurant_id: testRestaurantId,
        waiter_id: 'waiter-1',
        amount: 1000.00,
        commission_amount: 100.00,
        net_amount: 900.00,
        tip_type: 'waiter',
        payment_status: 'completed',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        restaurant_id: testRestaurantId,
        waiter_id: null,
        amount: 2000.00,
        commission_amount: 200.00,
        net_amount: 1800.00,
        tip_type: 'restaurant',
        payment_status: 'completed',
        created_at: '2024-01-20T10:00:00Z'
      }
    ]);

    // Calculate payouts
    const calculationResult = await calculateMonthlyPayouts({
      restaurant_id: testRestaurantId,
      month: testMonth
    });

    expect(calculationResult.success).toBe(true);
    expect(calculationResult.data).toBeDefined();

    // Generate payout records
    const generateResult = await generatePayoutRecords(
      testRestaurantId,
      testMonth,
      calculationResult.data!
    );

    expect(generateResult.success).toBe(true);
    expect(generateResult.payout_ids).toBeDefined();
    expect(generateResult.payout_ids!.length).toBeGreaterThan(0);

    // Verify payout records were created
    const { data: payouts, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('restaurant_id', testRestaurantId)
      .eq('payout_month', '2024-01-01');

    expect(error).toBeNull();
    expect(payouts).toBeDefined();
    expect(payouts!.length).toBeGreaterThan(0);

    // Check waiter payout record
    const waiterPayout = payouts!.find(p => p.payout_type === 'waiter');
    expect(waiterPayout).toBeDefined();
    expect(waiterPayout!.waiter_id).toBe('waiter-1');
    expect(waiterPayout!.amount).toBe(900.00);
    expect(waiterPayout!.status).toBe('pending');

    // Check group payout records
    const groupPayouts = payouts!.filter(p => p.payout_type === 'group');
    expect(groupPayouts.length).toBe(4); // All 4 distribution groups
  });

  it('should handle invalid month format', async () => {
    const result = await calculateMonthlyPayouts({
      restaurant_id: testRestaurantId,
      month: 'invalid-month'
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid month format');
  });

  it('should handle empty tip data', async () => {
    const result = await calculateMonthlyPayouts({
      restaurant_id: testRestaurantId,
      month: testMonth
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.waiter_payouts).toHaveLength(0);
    expect(result.data!.group_payouts).toHaveLength(4); // Groups exist but with 0 amounts
    expect(result.data!.total_amount).toBe(0);
    expect(result.data!.commission_deducted).toBe(0);
  });
});