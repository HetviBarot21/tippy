/**
 * Payout API Tests
 * 
 * Tests for payout API endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@/utils/supabase/server';

describe('Payout API Endpoints', () => {
  const testRestaurantId = 'test-restaurant-id';
  const testWaiterId = 'waiter-1';
  
  beforeEach(async () => {
    const supabase = createClient();
    
    // Create test restaurant
    await supabase.from('restaurants').insert({
      id: testRestaurantId,
      name: 'Test Restaurant',
      slug: 'test-restaurant'
    });

    // Create test waiter
    await supabase.from('waiters').insert({
      id: testWaiterId,
      restaurant_id: testRestaurantId,
      name: 'John Doe',
      phone_number: '254712345678',
      is_active: true
    });

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
    const supabase = createClient();
    await supabase.from('tips').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('payouts').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('distribution_groups').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('waiters').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('restaurants').delete().eq('id', testRestaurantId);
  });

  describe('POST /api/payouts/calculate', () => {
    it('should calculate payouts successfully', async () => {
      const supabase = createClient();
      
      // Create test tips
      await supabase.from('tips').insert([
        {
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId,
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

      const response = await fetch('/api/payouts/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: testRestaurantId,
          month: '2024-01'
        })
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.calculation).toBeDefined();
      expect(data.calculation.waiter_payouts).toHaveLength(1);
      expect(data.calculation.group_payouts).toHaveLength(4);
      expect(data.calculation.total_amount).toBeGreaterThan(0);
      expect(data.restaurant).toBe('Test Restaurant');
      expect(data.month).toBe('2024-01');
    });

    it('should generate payout records when requested', async () => {
      const supabase = createClient();
      
      // Create test tips
      await supabase.from('tips').insert({
        restaurant_id: testRestaurantId,
        waiter_id: testWaiterId,
        amount: 1000.00,
        commission_amount: 100.00,
        net_amount: 900.00,
        tip_type: 'waiter',
        payment_status: 