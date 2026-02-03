/**
 * Distribution Calculations Test Suite
 * Tests tip distribution logic for restaurant-wide tips
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for tests');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Mock distribution service for testing
const mockDistributionService = {
  calculateTipDistribution(groups, tipAmount) {
    const distributions = groups.map(group => {
      const amount = Math.round((tipAmount * group.percentage / 100) * 100) / 100;
      return {
        groupName: group.group_name,
        percentage: group.percentage,
        amount
      };
    });

    const totalDistributed = distributions.reduce((sum, dist) => sum + dist.amount, 0);

    return {
      distributions,
      totalDistributed
    };
  },

  validateDistributionGroups(groups) {
    const errors = [];
    let totalPercentage = 0;

    if (groups.length === 0) {
      errors.push('At least one distribution group is required');
      return { isValid: false, errors, totalPercentage: 0 };
    }

    groups.forEach((group, index) => {
      if (!group.group_name || group.group_name.trim().length === 0) {
        errors.push(`Group ${index + 1}: Group name is required`);
      }

      if (typeof group.percentage !== 'number') {
        errors.push(`Group ${index + 1}: Percentage must be a number`);
      } else if (group.percentage < 0) {
        errors.push(`Group ${index + 1}: Percentage cannot be negative`);
      } else if (group.percentage > 100) {
        errors.push(`Group ${index + 1}: Percentage cannot exceed 100%`);
      }

      totalPercentage += group.percentage || 0;
    });

    const roundedTotal = Math.round(totalPercentage * 100) / 100;
    if (Math.abs(roundedTotal - 100) > 0.01) {
      errors.push(`Total percentage must equal 100% (currently ${roundedTotal}%)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      totalPercentage: roundedTotal
    };
  }
};

// Test data
let testRestaurantId;
let testTipId;

describe('Distribution Calculations', () => {
  beforeEach(async () => {
    // Create test restaurant with unique slug
    const uniqueSlug = `test-distribution-restaurant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: 'Test Distribution Restaurant',
        slug: uniqueSlug,
        email: `test-distribution-${Date.now()}@example.com`,
        commission_rate: 10.00
      })
      .select()
      .single();

    if (restaurantError) throw restaurantError;
    testRestaurantId = restaurant.id;

    // Create test distribution groups
    const distributionGroups = [
      { restaurant_id: testRestaurantId, group_name: 'Waiters', percentage: 60.00 },
      { restaurant_id: testRestaurantId, group_name: 'Kitchen Staff', percentage: 20.00 },
      { restaurant_id: testRestaurantId, group_name: 'Cleaners', percentage: 10.00 },
      { restaurant_id: testRestaurantId, group_name: 'Management', percentage: 10.00 }
    ];

    const { error: groupsError } = await supabase
      .from('distribution_groups')
      .insert(distributionGroups);

    if (groupsError) throw groupsError;

    // Create test tip
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .insert({
        restaurant_id: testRestaurantId,
        amount: 1000.00,
        commission_amount: 100.00,
        net_amount: 900.00,
        tip_type: 'restaurant',
        payment_method: 'mpesa',
        payment_status: 'completed'
      })
      .select()
      .single();

    if (tipError) throw tipError;
    testTipId = tip.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testTipId) {
      await supabase.from('tip_distributions').delete().eq('tip_id', testTipId);
      await supabase.from('tips').delete().eq('id', testTipId);
    }
    
    if (testRestaurantId) {
      await supabase.from('distribution_groups').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('restaurants').delete().eq('id', testRestaurantId);
    }
  });

  it('should calculate tip distribution correctly', async () => {
    const groups = [
      { group_name: 'Waiters', percentage: 60.00 },
      { group_name: 'Kitchen Staff', percentage: 20.00 },
      { group_name: 'Cleaners', percentage: 10.00 },
      { group_name: 'Management', percentage: 10.00 }
    ];

    const result = mockDistributionService.calculateTipDistribution(groups, 1000);

    assert.strictEqual(result.distributions.length, 4);
    assert.strictEqual(result.totalDistributed, 1000);

    // Check individual distributions
    const waitersDistribution = result.distributions.find(d => d.groupName === 'Waiters');
    assert.strictEqual(waitersDistribution.amount, 600);
    assert.strictEqual(waitersDistribution.percentage, 60);

    const kitchenDistribution = result.distributions.find(d => d.groupName === 'Kitchen Staff');
    assert.strictEqual(kitchenDistribution.amount, 200);
    assert.strictEqual(kitchenDistribution.percentage, 20);

    const cleanersDistribution = result.distributions.find(d => d.groupName === 'Cleaners');
    assert.strictEqual(cleanersDistribution.amount, 100);
    assert.strictEqual(cleanersDistribution.percentage, 10);

    const managementDistribution = result.distributions.find(d => d.groupName === 'Management');
    assert.strictEqual(managementDistribution.amount, 100);
    assert.strictEqual(managementDistribution.percentage, 10);
  });

  it('should handle decimal amounts correctly', async () => {
    const groups = [
      { group_name: 'Waiters', percentage: 60.00 },
      { group_name: 'Kitchen Staff', percentage: 20.00 },
      { group_name: 'Cleaners', percentage: 10.00 },
      { group_name: 'Management', percentage: 10.00 }
    ];

    const result = mockDistributionService.calculateTipDistribution(groups, 333.33);

    assert.strictEqual(result.distributions.length, 4);

    // Check that amounts are properly rounded to 2 decimal places
    const waitersDistribution = result.distributions.find(d => d.groupName === 'Waiters');
    assert.strictEqual(waitersDistribution.amount, 200.00); // 60% of 333.33 = 199.998 -> 200.00

    const kitchenDistribution = result.distributions.find(d => d.groupName === 'Kitchen Staff');
    assert.strictEqual(kitchenDistribution.amount, 66.67); // 20% of 333.33 = 66.666 -> 66.67

    // Verify total is close to original (rounding may cause small differences)
    const total = result.distributions.reduce((sum, d) => sum + d.amount, 0);
    assert.ok(Math.abs(total - 333.33) < 0.05, `Total ${total} should be close to 333.33`);
  });

  it('should validate distribution groups correctly', async () => {
    // Test valid groups
    const validGroups = [
      { group_name: 'Waiters', percentage: 60.00 },
      { group_name: 'Kitchen Staff', percentage: 40.00 }
    ];

    const validResult = mockDistributionService.validateDistributionGroups(validGroups);
    assert.strictEqual(validResult.isValid, true);
    assert.strictEqual(validResult.totalPercentage, 100);
    assert.strictEqual(validResult.errors.length, 0);

    // Test invalid groups (doesn't sum to 100%)
    const invalidGroups = [
      { group_name: 'Waiters', percentage: 60.00 },
      { group_name: 'Kitchen Staff', percentage: 30.00 }
    ];

    const invalidResult = mockDistributionService.validateDistributionGroups(invalidGroups);
    assert.strictEqual(invalidResult.isValid, false);
    assert.strictEqual(invalidResult.totalPercentage, 90);
    assert.ok(invalidResult.errors.some(e => e.includes('Total percentage must equal 100%')));

    // Test empty groups
    const emptyResult = mockDistributionService.validateDistributionGroups([]);
    assert.strictEqual(emptyResult.isValid, false);
    assert.ok(emptyResult.errors.some(e => e.includes('At least one distribution group is required')));

    // Test negative percentage
    const negativeGroups = [
      { group_name: 'Waiters', percentage: -10.00 },
      { group_name: 'Kitchen Staff', percentage: 110.00 }
    ];

    const negativeResult = mockDistributionService.validateDistributionGroups(negativeGroups);
    assert.strictEqual(negativeResult.isValid, false);
    assert.ok(negativeResult.errors.some(e => e.includes('Percentage cannot be negative')));
    assert.ok(negativeResult.errors.some(e => e.includes('Percentage cannot exceed 100%')));
  });

  it('should create tip distribution records in database', async () => {
    // Create tip distributions manually to test database operations
    const distributions = [
      {
        tip_id: testTipId,
        restaurant_id: testRestaurantId,
        group_name: 'Waiters',
        percentage: 60.00,
        amount: 540.00 // 60% of 900 (net amount)
      },
      {
        tip_id: testTipId,
        restaurant_id: testRestaurantId,
        group_name: 'Kitchen Staff',
        percentage: 20.00,
        amount: 180.00 // 20% of 900
      },
      {
        tip_id: testTipId,
        restaurant_id: testRestaurantId,
        group_name: 'Cleaners',
        percentage: 10.00,
        amount: 90.00 // 10% of 900
      },
      {
        tip_id: testTipId,
        restaurant_id: testRestaurantId,
        group_name: 'Management',
        percentage: 10.00,
        amount: 90.00 // 10% of 900
      }
    ];

    const { data: createdDistributions, error } = await supabase
      .from('tip_distributions')
      .insert(distributions)
      .select();

    assert.strictEqual(error, null);
    assert.strictEqual(createdDistributions.length, 4);

    // Verify distributions were saved correctly
    const totalDistributed = createdDistributions.reduce((sum, d) => sum + d.amount, 0);
    assert.strictEqual(totalDistributed, 900); // Should equal net amount

    // Verify individual distributions
    const waitersDistribution = createdDistributions.find(d => d.group_name === 'Waiters');
    assert.strictEqual(waitersDistribution.amount, 540);
    assert.strictEqual(waitersDistribution.percentage, 60);
  });

  it('should handle distribution percentage edge cases', async () => {
    // Test with uneven percentages that don't divide evenly
    const groups = [
      { group_name: 'Group A', percentage: 33.33 },
      { group_name: 'Group B', percentage: 33.33 },
      { group_name: 'Group C', percentage: 33.34 }
    ];

    const result = mockDistributionService.calculateTipDistribution(groups, 100);

    assert.strictEqual(result.distributions.length, 3);
    
    // Check that rounding works correctly
    const groupA = result.distributions.find(d => d.groupName === 'Group A');
    const groupB = result.distributions.find(d => d.groupName === 'Group B');
    const groupC = result.distributions.find(d => d.groupName === 'Group C');

    assert.strictEqual(groupA.amount, 33.33);
    assert.strictEqual(groupB.amount, 33.33);
    assert.strictEqual(groupC.amount, 33.34);

    // Total should be exactly 100 (or very close due to rounding)
    const total = result.distributions.reduce((sum, d) => sum + d.amount, 0);
    assert.ok(Math.abs(total - 100) < 0.01);
  });
});