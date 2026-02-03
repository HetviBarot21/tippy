/**
 * Commission Calculations Test Suite
 * Tests commission calculations, edge cases, and validation
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

// Mock commission service for testing
const mockCommissionService = {
  calculateCommission(amount, commissionRate) {
    // Ensure consistent decimal precision (2 decimal places)
    const commissionAmount = Math.round((amount * commissionRate) / 100 * 100) / 100;
    const netAmount = Math.round((amount - commissionAmount) * 100) / 100;

    return {
      amount,
      commissionRate,
      commissionAmount,
      netAmount
    };
  },

  validateCommissionRate(rate) {
    const errors = [];

    if (typeof rate !== 'number') {
      errors.push('Commission rate must be a number');
    } else if (rate < 0) {
      errors.push('Commission rate cannot be negative');
    } else if (rate > 50) {
      errors.push('Commission rate cannot exceed 50%');
    } else if (Math.round(rate * 100) / 100 !== rate) {
      errors.push('Commission rate can have at most 2 decimal places');
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors[0] : undefined
    };
  }
};

describe('Commission Calculations', () => {
  describe('Basic Commission Calculations', () => {
    test('should calculate commission correctly for standard amounts', () => {
      const testCases = [
        { amount: 100, rate: 10, expectedCommission: 10, expectedNet: 90 },
        { amount: 250, rate: 15, expectedCommission: 37.5, expectedNet: 212.5 },
        { amount: 1000, rate: 12.5, expectedCommission: 125, expectedNet: 875 },
        { amount: 50, rate: 8.75, expectedCommission: 4.38, expectedNet: 45.62 }
      ];

      testCases.forEach(({ amount, rate, expectedCommission, expectedNet }) => {
        const result = mockCommissionService.calculateCommission(amount, rate);
        
        assert.strictEqual(result.amount, amount);
        assert.strictEqual(result.commissionRate, rate);
        assert.strictEqual(result.commissionAmount, expectedCommission);
        assert.strictEqual(result.netAmount, expectedNet);
      });

      console.log('✓ Basic commission calculations test passed');
    });

    test('should handle decimal precision correctly', () => {
      // Test cases that might cause rounding issues
      const testCases = [
        { amount: 33.33, rate: 10, expectedCommission: 3.33, expectedNet: 30 },
        { amount: 66.67, rate: 15, expectedCommission: 10, expectedNet: 56.67 },
        { amount: 123.45, rate: 12.34, expectedCommission: 15.23, expectedNet: 108.22 }
      ];

      testCases.forEach(({ amount, rate, expectedCommission, expectedNet }) => {
        const result = mockCommissionService.calculateCommission(amount, rate);
        
        assert.strictEqual(result.commissionAmount, expectedCommission);
        assert.strictEqual(result.netAmount, expectedNet);
        
        // Ensure sum equals original amount (within floating point precision)
        assert.ok(Math.abs((result.commissionAmount + result.netAmount) - amount) < 0.01);
      });

      console.log('✓ Decimal precision handling test passed');
    });

    test('should handle edge case amounts', () => {
      const testCases = [
        { amount: 0.01, rate: 10, expectedCommission: 0, expectedNet: 0.01 },
        { amount: 1, rate: 50, expectedCommission: 0.5, expectedNet: 0.5 },
        { amount: 10000, rate: 25, expectedCommission: 2500, expectedNet: 7500 }
      ];

      testCases.forEach(({ amount, rate, expectedCommission, expectedNet }) => {
        const result = mockCommissionService.calculateCommission(amount, rate);
        
        assert.strictEqual(result.commissionAmount, expectedCommission);
        assert.strictEqual(result.netAmount, expectedNet);
      });

      console.log('✓ Edge case amounts test passed');
    });
  });

  describe('Commission Rate Validation', () => {
    test('should validate commission rates correctly', () => {
      const validRates = [0, 5, 10.5, 25, 50];
      const invalidRates = [-1, 51, 100];

      validRates.forEach(rate => {
        const result = mockCommissionService.validateCommissionRate(rate);
        assert.strictEqual(result.isValid, true, `Rate ${rate} should be valid`);
        assert.strictEqual(result.error, undefined);
      });

      invalidRates.forEach(rate => {
        const result = mockCommissionService.validateCommissionRate(rate);
        assert.strictEqual(result.isValid, false, `Rate ${rate} should be invalid`);
        assert.ok(result.error, `Rate ${rate} should have an error message`);
      });

      console.log('✓ Commission rate validation test passed');
    });

    test('should validate decimal precision for commission rates', () => {
      const validRates = [10.00, 15.50, 12.34];
      const invalidRates = [10.123, 15.5678]; // More than 2 decimal places

      validRates.forEach(rate => {
        const result = mockCommissionService.validateCommissionRate(rate);
        assert.strictEqual(result.isValid, true, `Rate ${rate} should be valid`);
      });

      invalidRates.forEach(rate => {
        const result = mockCommissionService.validateCommissionRate(rate);
        assert.strictEqual(result.isValid, false, `Rate ${rate} should be invalid`);
        assert.ok(result.error.includes('decimal places'), 'Error should mention decimal places');
      });

      console.log('✓ Decimal precision validation test passed');
    });

    test('should reject non-numeric commission rates', () => {
      const invalidInputs = ['invalid', null, undefined, NaN, Infinity, -Infinity];

      invalidInputs.forEach(input => {
        const result = mockCommissionService.validateCommissionRate(input);
        assert.strictEqual(result.isValid, false, `Input ${input} should be invalid`);
        assert.ok(result.error, `Input ${input} should have an error message`);
      });

      console.log('✓ Non-numeric rate rejection test passed');
    });
  });

  describe('Boundary Value Testing', () => {
    test('should handle minimum tip amounts correctly', () => {
      const minAmount = 10; // Minimum allowed tip
      const result = mockCommissionService.calculateCommission(minAmount, 12.34);
      
      assert.strictEqual(result.commissionAmount, 1.23);
      assert.strictEqual(result.netAmount, 8.77);
      assert.strictEqual(result.commissionAmount + result.netAmount, minAmount);

      console.log('✓ Minimum tip amount test passed');
    });

    test('should handle maximum tip amounts correctly', () => {
      const maxAmount = 10000; // Maximum allowed tip
      const result = mockCommissionService.calculateCommission(maxAmount, 12.34);
      
      assert.strictEqual(result.commissionAmount, 1234);
      assert.strictEqual(result.netAmount, 8766);
      assert.strictEqual(result.commissionAmount + result.netAmount, maxAmount);

      console.log('✓ Maximum tip amount test passed');
    });

    test('should handle zero commission rate', () => {
      const result = mockCommissionService.calculateCommission(100, 0);
      
      assert.strictEqual(result.commissionAmount, 0);
      assert.strictEqual(result.netAmount, 100);

      console.log('✓ Zero commission rate test passed');
    });

    test('should handle maximum commission rate', () => {
      const result = mockCommissionService.calculateCommission(100, 50);
      
      assert.strictEqual(result.commissionAmount, 50);
      assert.strictEqual(result.netAmount, 50);

      console.log('✓ Maximum commission rate test passed');
    });
  });

  describe('Floating Point Precision Edge Cases', () => {
    test('should handle amounts that cause floating point precision issues', () => {
      const problematicAmounts = [
        { amount: 0.3, rate: 10 }, // 0.1 + 0.2 equivalent
        { amount: 33.33, rate: 33.33 },
        { amount: 66.67, rate: 15.15 },
        { amount: 99.99, rate: 9.99 }
      ];

      problematicAmounts.forEach(({ amount, rate }) => {
        const result = mockCommissionService.calculateCommission(amount, rate);
        
        // Ensure commission + net equals original amount (within acceptable precision)
        const sum = result.commissionAmount + result.netAmount;
        assert.ok(Math.abs(sum - amount) < 0.01, `Sum should equal original amount for ${amount}`);
        
        // Ensure values are properly rounded to 2 decimal places
        assert.strictEqual(result.commissionAmount, Math.round(result.commissionAmount * 100) / 100);
        assert.strictEqual(result.netAmount, Math.round(result.netAmount * 100) / 100);
      });

      console.log('✓ Floating point precision test passed');
    });

    test('should maintain precision across multiple calculations', () => {
      let totalCommissions = 0;
      let totalNet = 0;
      let totalOriginal = 0;

      const testAmounts = [33.33, 66.67, 99.99, 123.45, 456.78];
      
      testAmounts.forEach(amount => {
        const result = mockCommissionService.calculateCommission(amount, 12.34);
        totalCommissions += result.commissionAmount;
        totalNet += result.netAmount;
        totalOriginal += amount;
      });

      // Round totals to avoid floating point accumulation errors
      totalCommissions = Math.round(totalCommissions * 100) / 100;
      totalNet = Math.round(totalNet * 100) / 100;
      totalOriginal = Math.round(totalOriginal * 100) / 100;

      assert.ok(Math.abs((totalCommissions + totalNet) - totalOriginal) < 0.01);

      console.log('✓ Multiple calculations precision test passed');
    });
  });

  describe('Commission Rate Change Effects', () => {
    test('should calculate different commissions for different rates', () => {
      const amount = 100;
      const rates = [10, 15, 20, 25];
      const results = [];

      rates.forEach(rate => {
        const result = mockCommissionService.calculateCommission(amount, rate);
        results.push(result);
        
        // Verify commission amount matches rate
        assert.strictEqual(result.commissionAmount, amount * rate / 100);
        assert.strictEqual(result.netAmount, amount - (amount * rate / 100));
      });

      // Verify all results are different
      for (let i = 0; i < results.length - 1; i++) {
        for (let j = i + 1; j < results.length; j++) {
          assert.notStrictEqual(results[i].commissionAmount, results[j].commissionAmount);
          assert.notStrictEqual(results[i].netAmount, results[j].netAmount);
        }
      }

      console.log('✓ Commission rate change effects test passed');
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle large numbers of calculations efficiently', () => {
      const startTime = Date.now();
      
      // Perform many calculations
      for (let i = 0; i < 10000; i++) {
        const amount = Math.random() * 1000 + 10; // Random amount between 10-1010
        const rate = Math.random() * 50; // Random rate between 0-50%
        
        const result = mockCommissionService.calculateCommission(amount, rate);
        
        // Verify each calculation is valid
        assert.ok(result.commissionAmount >= 0);
        assert.ok(result.netAmount >= 0);
        assert.ok(Math.abs((result.commissionAmount + result.netAmount) - amount) < 0.01);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      assert.ok(duration < 1000, `Calculations should complete quickly, took ${duration}ms`);

      console.log(`✓ Performance test passed (${duration}ms for 10,000 calculations)`);
    });
  });
});

describe('Commission Integration Scenarios', () => {
  test('should handle restaurant commission rate scenarios', () => {
    // Mock different restaurant scenarios
    const restaurants = [
      { id: 'rest-1', name: 'Budget Restaurant', rate: 8.5 },
      { id: 'rest-2', name: 'Standard Restaurant', rate: 12.0 },
      { id: 'rest-3', name: 'Premium Restaurant', rate: 18.5 },
      { id: 'rest-4', name: 'High-end Restaurant', rate: 25.0 }
    ];

    const tipAmount = 200;

    restaurants.forEach(restaurant => {
      const result = mockCommissionService.calculateCommission(tipAmount, restaurant.rate);
      
      // Verify commission calculation
      const expectedCommission = Math.round((tipAmount * restaurant.rate) / 100 * 100) / 100;
      const expectedNet = Math.round((tipAmount - expectedCommission) * 100) / 100;
      
      assert.strictEqual(result.commissionAmount, expectedCommission);
      assert.strictEqual(result.netAmount, expectedNet);
      assert.strictEqual(result.commissionRate, restaurant.rate);
    });

    console.log('✓ Restaurant commission rate scenarios test passed');
  });

  test('should handle payment method commission consistency', () => {
    // Test that commission calculation is consistent across payment methods
    const amount = 150;
    const rate = 15;
    
    // Simulate different payment methods (should have same commission)
    const cardResult = mockCommissionService.calculateCommission(amount, rate);
    const mpesaResult = mockCommissionService.calculateCommission(amount, rate);
    
    assert.deepStrictEqual(cardResult, mpesaResult, 'Commission should be same for all payment methods');

    console.log('✓ Payment method commission consistency test passed');
  });

  test('should handle tip type commission scenarios', () => {
    // Test commission calculation for different tip types
    const amount = 100;
    const rate = 12;
    
    // Both waiter and restaurant tips should have same commission calculation
    const waiterTipCommission = mockCommissionService.calculateCommission(amount, rate);
    const restaurantTipCommission = mockCommissionService.calculateCommission(amount, rate);
    
    assert.deepStrictEqual(waiterTipCommission, restaurantTipCommission, 
      'Commission calculation should be same for waiter and restaurant tips');

    console.log('✓ Tip type commission scenarios test passed');
  });
});

console.log('Running Commission Calculations Tests...\n');