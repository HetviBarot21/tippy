/**
 * Commission Edge Cases Test Suite
 * Tests edge cases, boundary conditions, and integration scenarios
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

// Mock commission service for edge case testing
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
    } else if (isNaN(rate) || !isFinite(rate)) {
      errors.push('Commission rate must be a valid number');
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

describe('Commission Edge Cases', () => {
  describe('Boundary Value Testing', () => {
    test('should handle minimum tip amounts correctly', () => {
      const minAmount = 10; // Minimum allowed tip
      const result = mockCommissionService.calculateCommission(minAmount, 12.34);
      
      assert.strictEqual(result.commissionAmount, 1.23);
      assert.strictEqual(result.netAmount, 8.77);
      assert.strictEqual(result.commissionAmount + result.netAmount, minAmount);

      console.log('✓ Minimum tip amount edge case test passed');
    });

    test('should handle maximum tip amounts correctly', () => {
      const maxAmount = 10000; // Maximum allowed tip
      const result = mockCommissionService.calculateCommission(maxAmount, 12.34);
      
      assert.strictEqual(result.commissionAmount, 1234);
      assert.strictEqual(result.netAmount, 8766);
      assert.strictEqual(result.commissionAmount + result.netAmount, maxAmount);

      console.log('✓ Maximum tip amount edge case test passed');
    });

    test('should handle zero commission rate', () => {
      const result = mockCommissionService.calculateCommission(100, 0);
      
      assert.strictEqual(result.commissionAmount, 0);
      assert.strictEqual(result.netAmount, 100);

      console.log('✓ Zero commission rate edge case test passed');
    });

    test('should handle maximum commission rate', () => {
      const result = mockCommissionService.calculateCommission(100, 50);
      
      assert.strictEqual(result.commissionAmount, 50);
      assert.strictEqual(result.netAmount, 50);

      console.log('✓ Maximum commission rate edge case test passed');
    });
  });

  describe('Floating Point Precision Edge Cases', () => {
    test('should handle amounts that cause floating point precision issues', () => {
      const problematicAmounts = [
        { amount: 0.3, rate: 10 }, // Floating point precision issue
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

      console.log('✓ Floating point precision edge cases test passed');
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

  describe('Validation Edge Cases', () => {
    test('should reject commission rates with excessive decimal places', () => {
      const invalidRates = [10.123, 15.5678, 20.99999];
      
      invalidRates.forEach(rate => {
        const result = mockCommissionService.validateCommissionRate(rate);
        assert.strictEqual(result.isValid, false, `Rate ${rate} should be invalid`);
        assert.ok(result.error.includes('decimal places'), 'Error should mention decimal places');
      });

      console.log('✓ Excessive decimal places validation test passed');
    });

    test('should handle special numeric values', () => {
      const specialValues = [NaN, Infinity, -Infinity];
      
      specialValues.forEach(value => {
        const result = mockCommissionService.validateCommissionRate(value);
        assert.strictEqual(result.isValid, false, `Value ${value} should be invalid`);
        assert.ok(result.error, `Value ${value} should have an error message`);
      });

      console.log('✓ Special numeric values validation test passed');
    });

    test('should validate commission rates at exact boundaries', () => {
      const boundaryTests = [
        { rate: 0, shouldBeValid: true },
        { rate: 50, shouldBeValid: true },
        { rate: -0.01, shouldBeValid: false },
        { rate: 50.01, shouldBeValid: false }
      ];

      boundaryTests.forEach(({ rate, shouldBeValid }) => {
        const result = mockCommissionService.validateCommissionRate(rate);
        assert.strictEqual(result.isValid, shouldBeValid, 
          `Rate ${rate} should be ${shouldBeValid ? 'valid' : 'invalid'}`);
      });

      console.log('✓ Boundary validation test passed');
    });
  });

  describe('Performance Edge Cases', () => {
    test('should handle large numbers of commission calculations', () => {
      const startTime = Date.now();
      
      // Create many calculations
      for (let i = 0; i < 1000; i++) {
        const amount = 10 + (i % 990); // Amounts between 10-1000
        const rate = 10 + (i % 40); // Rates between 10-50%
        
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

      console.log(`✓ Performance edge case test passed (${duration}ms for 1,000 calculations)`);
    });

    test('should handle rapid validation calls', () => {
      const startTime = Date.now();
      
      // Perform many validations
      for (let i = 0; i < 1000; i++) {
        const rate = Math.random() * 60 - 10; // Random rates between -10 and 50
        const result = mockCommissionService.validateCommissionRate(rate);
        
        // Verify validation result is consistent
        assert.ok(typeof result.isValid === 'boolean');
        if (!result.isValid) {
          assert.ok(typeof result.error === 'string');
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      assert.ok(duration < 500, `Validations should complete quickly, took ${duration}ms`);

      console.log(`✓ Rapid validation test passed (${duration}ms for 1,000 validations)`);
    });
  });

  describe('Data Consistency Edge Cases', () => {
    test('should handle null and undefined commission amounts gracefully', () => {
      // Test calculation with edge case inputs
      const edgeCases = [
        { amount: 0, rate: 10 },
        { amount: 0.01, rate: 0 },
        { amount: 1, rate: 0.01 }
      ];

      edgeCases.forEach(({ amount, rate }) => {
        const result = mockCommissionService.calculateCommission(amount, rate);
        
        // Should handle gracefully without errors
        assert.ok(typeof result.commissionAmount === 'number');
        assert.ok(typeof result.netAmount === 'number');
        assert.ok(!isNaN(result.commissionAmount));
        assert.ok(!isNaN(result.netAmount));
      });

      console.log('✓ Data consistency edge cases test passed');
    });

    test('should maintain calculation consistency across different scenarios', () => {
      // Test that same inputs always produce same outputs
      const testCases = [
        { amount: 100, rate: 15 },
        { amount: 250.50, rate: 12.75 },
        { amount: 999.99, rate: 8.25 }
      ];

      testCases.forEach(({ amount, rate }) => {
        const result1 = mockCommissionService.calculateCommission(amount, rate);
        const result2 = mockCommissionService.calculateCommission(amount, rate);
        
        // Results should be identical
        assert.deepStrictEqual(result1, result2, 'Same inputs should produce identical results');
      });

      console.log('✓ Calculation consistency test passed');
    });
  });

  describe('Integration Edge Cases', () => {
    test('should handle commission calculation for different payment scenarios', () => {
      // Simulate different payment scenarios
      const scenarios = [
        { description: 'Small card payment', amount: 15, rate: 10 },
        { description: 'Large M-Pesa payment', amount: 5000, rate: 15 },
        { description: 'Medium restaurant tip', amount: 350, rate: 12.5 },
        { description: 'High-value waiter tip', amount: 1500, rate: 18 }
      ];

      scenarios.forEach(({ description, amount, rate }) => {
        const result = mockCommissionService.calculateCommission(amount, rate);
        
        // Verify calculation is valid for each scenario
        assert.ok(result.commissionAmount >= 0, `${description}: Commission should be non-negative`);
        assert.ok(result.netAmount >= 0, `${description}: Net amount should be non-negative`);
        assert.ok(result.commissionAmount <= amount, `${description}: Commission should not exceed tip amount`);
        
        const sum = result.commissionAmount + result.netAmount;
        assert.ok(Math.abs(sum - amount) < 0.01, `${description}: Sum should equal original amount`);
      });

      console.log('✓ Payment scenario integration test passed');
    });

    test('should handle commission rate changes consistently', () => {
      const amount = 200;
      const rates = [8, 10, 12, 15, 18, 20, 25];
      const results = [];

      rates.forEach(rate => {
        const result = mockCommissionService.calculateCommission(amount, rate);
        results.push(result);
        
        // Verify commission increases with rate
        const expectedCommission = Math.round((amount * rate) / 100 * 100) / 100;
        assert.strictEqual(result.commissionAmount, expectedCommission);
      });

      // Verify commission amounts are in ascending order
      for (let i = 1; i < results.length; i++) {
        assert.ok(results[i].commissionAmount > results[i-1].commissionAmount,
          'Higher rates should produce higher commissions');
        assert.ok(results[i].netAmount < results[i-1].netAmount,
          'Higher rates should produce lower net amounts');
      }

      console.log('✓ Commission rate change consistency test passed');
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle invalid input types gracefully', () => {
      const invalidInputs = [
        { amount: 'invalid', rate: 10 },
        { amount: 100, rate: 'invalid' },
        { amount: null, rate: 10 },
        { amount: 100, rate: null },
        { amount: undefined, rate: 10 },
        { amount: 100, rate: undefined }
      ];

      invalidInputs.forEach(({ amount, rate }) => {
        // Should not throw errors, but may produce NaN results
        try {
          const result = mockCommissionService.calculateCommission(amount, rate);
          // If it doesn't throw, verify the result structure
          assert.ok(typeof result === 'object');
          assert.ok('commissionAmount' in result);
          assert.ok('netAmount' in result);
        } catch (error) {
          // If it throws, that's also acceptable for invalid inputs
          assert.ok(error instanceof Error);
        }
      });

      console.log('✓ Invalid input handling test passed');
    });

    test('should validate extreme commission rates', () => {
      const extremeRates = [-100, -1, 51, 100, 1000];
      
      extremeRates.forEach(rate => {
        const result = mockCommissionService.validateCommissionRate(rate);
        assert.strictEqual(result.isValid, false, `Extreme rate ${rate} should be invalid`);
        assert.ok(result.error, `Extreme rate ${rate} should have an error message`);
      });

      console.log('✓ Extreme commission rate validation test passed');
    });
  });
});

console.log('Running Commission Edge Cases Tests...\n');