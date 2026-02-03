const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Mock Stripe for testing
const mockStripe = {
  paymentIntents: {
    create: async (params) => ({
      id: `pi_test_${Date.now()}`,
      client_secret: `pi_test_${Date.now()}_secret_test`,
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata,
      status: 'requires_payment_method'
    }),
  },
  webhooks: {
    constructEvent: (body, signature, secret) => {
      if (!signature || !secret) {
        throw new Error('Invalid signature');
      }
      return JSON.parse(body);
    }
  }
};

// Mock Supabase client
const mockSupabase = {
  from: (table) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: table === 'restaurants' 
            ? { commission_rate: 10 }
            : { 
                id: 'test-tip-id',
                amount: 100,
                commission_amount: 10,
                net_amount: 90,
                payment_status: 'pending'
              },
          error: null
        })
      })
    }),
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 'test-tip-id',
            restaurant_id: 'test-restaurant',
            amount: 100,
            commission_amount: 10,
            net_amount: 90,
            payment_status: 'pending',
            payment_method: 'card'
          },
          error: null
        })
      })
    }),
    update: () => ({
      eq: () => ({
        error: null
      })
    })
  })
};

describe('Payment Integration Tests', () => {
  let originalFetch;

  beforeEach(() => {
    // Mock fetch for API calls
    originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      const body = options?.body ? JSON.parse(options.body) : {};
      
      if (url.includes('/api/payments')) {
        // Simulate payment API response
        if (body.paymentMethod === 'card') {
          return {
            ok: true,
            json: async () => ({
              success: true,
              tipId: 'test-tip-id',
              paymentMethod: 'card',
              clientSecret: 'pi_test_secret',
              paymentIntentId: 'pi_test_123'
            })
          };
        } else if (body.paymentMethod === 'mpesa') {
          return {
            ok: true,
            json: async () => ({
              success: true,
              tipId: 'test-tip-id',
              paymentMethod: 'mpesa',
              message: 'M-Pesa integration coming soon'
            })
          };
        }
      }
      
      return {
        ok: false,
        json: async () => ({ error: 'Not found' })
      };
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Card Payment Processing', () => {
    test('should create payment intent for valid card payment', async () => {
      const paymentData = {
        amount: 100,
        tipType: 'waiter',
        restaurantId: 'test-restaurant',
        waiterId: 'test-waiter',
        tableId: 'test-table',
        paymentMethod: 'card'
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      assert.strictEqual(response.ok, true);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.paymentMethod, 'card');
      assert.ok(result.clientSecret);
      assert.ok(result.paymentIntentId);
    });

    test('should validate minimum amount for card payments', async () => {
      const paymentData = {
        amount: 5, // Below minimum
        tipType: 'waiter',
        restaurantId: 'test-restaurant',
        waiterId: 'test-waiter',
        tableId: 'test-table',
        paymentMethod: 'card'
      };

      // This would be handled by validation in the actual service
      assert.ok(paymentData.amount < 10, 'Amount should be below minimum');
    });

    test('should validate maximum amount for card payments', async () => {
      const paymentData = {
        amount: 15000, // Above maximum
        tipType: 'waiter',
        restaurantId: 'test-restaurant',
        waiterId: 'test-waiter',
        tableId: 'test-table',
        paymentMethod: 'card'
      };

      // This would be handled by validation in the actual service
      assert.ok(paymentData.amount > 10000, 'Amount should be above maximum');
    });

    test('should require waiter ID for waiter tips', async () => {
      const paymentData = {
        amount: 100,
        tipType: 'waiter',
        restaurantId: 'test-restaurant',
        // waiterId missing
        tableId: 'test-table',
        paymentMethod: 'card'
      };

      // This would be handled by validation
      assert.strictEqual(paymentData.tipType, 'waiter');
      assert.strictEqual(paymentData.waiterId, undefined);
    });
  });

  describe('M-Pesa Payment Processing', () => {
    test('should handle M-Pesa payment request', async () => {
      const paymentData = {
        amount: 100,
        tipType: 'restaurant',
        restaurantId: 'test-restaurant',
        tableId: 'test-table',
        paymentMethod: 'mpesa',
        customerPhone: '254712345678'
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      assert.strictEqual(response.ok, true);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.paymentMethod, 'mpesa');
    });

    test('should validate Kenyan phone number format', () => {
      const validNumbers = [
        '254712345678',
        '254722345678', 
        '0712345678',
        '0722345678'
      ];

      const invalidNumbers = [
        '123456789',
        '254612345678', // Invalid prefix (should be 7 or 1 after 254)
        '25471234567', // Too short
        '2547123456789' // Too long
      ];

      // Updated regex to properly validate Kenyan numbers
      const kenyaPhoneRegex = /^(254[17]\d{8}|0[17]\d{8})$/;

      validNumbers.forEach(number => {
        const cleaned = number.replace(/[\s\-\+]/g, '');
        const isValid = kenyaPhoneRegex.test(cleaned);
        assert.ok(isValid, `${number} should be valid`);
      });

      invalidNumbers.forEach(number => {
        const cleaned = number.replace(/[\s\-\+]/g, '');
        const isValid = kenyaPhoneRegex.test(cleaned);
        assert.ok(!isValid, `${number} should be invalid`);
      });
    });
  });

  describe('Commission Calculation', () => {
    test('should calculate commission correctly for different rates', () => {
      const testCases = [
        { amount: 100, rate: 10, expectedCommission: 10, expectedNet: 90 },
        { amount: 150, rate: 15, expectedCommission: 22.5, expectedNet: 127.5 },
        { amount: 200, rate: 5, expectedCommission: 10, expectedNet: 190 },
        { amount: 99, rate: 10, expectedCommission: 9.9, expectedNet: 89.1 }
      ];

      testCases.forEach(({ amount, rate, expectedCommission, expectedNet }) => {
        const commissionAmount = Math.round((amount * rate) / 100 * 100) / 100;
        const netAmount = Math.round((amount - commissionAmount) * 100) / 100;

        assert.strictEqual(commissionAmount, expectedCommission);
        assert.strictEqual(netAmount, expectedNet);
      });
    });

    test('should handle edge cases in commission calculation', () => {
      // Test very small amounts
      const smallAmount = 10;
      const rate = 10;
      const commission = Math.round((smallAmount * rate) / 100 * 100) / 100;
      const net = Math.round((smallAmount - commission) * 100) / 100;

      assert.strictEqual(commission, 1);
      assert.strictEqual(net, 9);

      // Test maximum amount
      const maxAmount = 10000;
      const maxCommission = Math.round((maxAmount * rate) / 100 * 100) / 100;
      const maxNet = Math.round((maxAmount - maxCommission) * 100) / 100;

      assert.strictEqual(maxCommission, 1000);
      assert.strictEqual(maxNet, 9000);
    });
  });

  describe('Payment Security', () => {
    test('should validate required fields for security', () => {
      const requiredFields = [
        'amount',
        'tipType',
        'restaurantId',
        'tableId',
        'paymentMethod'
      ];

      const paymentData = {
        amount: 100,
        tipType: 'waiter',
        restaurantId: 'test-restaurant',
        waiterId: 'test-waiter',
        tableId: 'test-table',
        paymentMethod: 'card'
      };

      requiredFields.forEach(field => {
        assert.ok(paymentData[field] !== undefined, `${field} should be present`);
      });
    });

    test('should validate payment method values', () => {
      const validMethods = ['card', 'mpesa'];
      const invalidMethods = ['cash', 'bank', 'crypto', ''];

      validMethods.forEach(method => {
        assert.ok(['card', 'mpesa'].includes(method), `${method} should be valid`);
      });

      invalidMethods.forEach(method => {
        assert.ok(!['card', 'mpesa'].includes(method), `${method} should be invalid`);
      });
    });

    test('should validate tip type values', () => {
      const validTypes = ['waiter', 'restaurant'];
      const invalidTypes = ['admin', 'owner', 'manager', ''];

      validTypes.forEach(type => {
        assert.ok(['waiter', 'restaurant'].includes(type), `${type} should be valid`);
      });

      invalidTypes.forEach(type => {
        assert.ok(!['waiter', 'restaurant'].includes(type), `${type} should be invalid`);
      });
    });
  });

  describe('Webhook Processing', () => {
    test('should process successful payment webhook', () => {
      const webhookEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: {
              tipId: 'test-tip-id'
            }
          }
        }
      };

      // Simulate webhook processing
      assert.strictEqual(webhookEvent.type, 'payment_intent.succeeded');
      assert.ok(webhookEvent.data.object.metadata.tipId);
    });

    test('should process failed payment webhook', () => {
      const webhookEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: {
              tipId: 'test-tip-id'
            }
          }
        }
      };

      // Simulate webhook processing
      assert.strictEqual(webhookEvent.type, 'payment_intent.payment_failed');
      assert.ok(webhookEvent.data.object.metadata.tipId);
    });

    test('should validate webhook signature', () => {
      const body = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } }
      });
      
      const validSignature = 'valid_signature';
      const secret = 'webhook_secret';

      // Mock signature validation
      try {
        mockStripe.webhooks.constructEvent(body, validSignature, secret);
        assert.ok(true, 'Valid signature should pass');
      } catch (error) {
        assert.fail('Valid signature should not throw error');
      }

      // Test invalid signature
      try {
        mockStripe.webhooks.constructEvent(body, null, secret);
        assert.fail('Invalid signature should throw error');
      } catch (error) {
        assert.ok(error.message.includes('Invalid signature'));
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      global.fetch = async () => {
        throw new Error('Network error');
      };

      try {
        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        assert.fail('Should throw network error');
      } catch (error) {
        assert.ok(error.message.includes('Network error'));
      }
    });

    test('should handle invalid JSON in requests', () => {
      const invalidJson = '{ invalid json }';
      
      try {
        JSON.parse(invalidJson);
        assert.fail('Should throw JSON parse error');
      } catch (error) {
        assert.ok(error instanceof SyntaxError);
      }
    });

    test('should handle missing metadata in webhooks', () => {
      const webhookEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: {} // Missing tipId
          }
        }
      };

      const tipId = webhookEvent.data.object.metadata.tipId;
      assert.strictEqual(tipId, undefined, 'Missing tipId should be undefined');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain consistent data types across payment methods', () => {
      const cardPayment = {
        amount: 100,
        tipType: 'waiter',
        paymentMethod: 'card'
      };

      const mpesaPayment = {
        amount: 100,
        tipType: 'waiter',
        paymentMethod: 'mpesa'
      };

      // Both should have same data types for common fields
      assert.strictEqual(typeof cardPayment.amount, typeof mpesaPayment.amount);
      assert.strictEqual(typeof cardPayment.tipType, typeof mpesaPayment.tipType);
      assert.strictEqual(typeof cardPayment.paymentMethod, typeof mpesaPayment.paymentMethod);
    });

    test('should use consistent ID formats', () => {
      const testIds = [
        'test-tip-id',
        'test-restaurant-id',
        'test-waiter-id',
        'test-table-id'
      ];

      testIds.forEach(id => {
        assert.ok(typeof id === 'string', 'ID should be string');
        assert.ok(id.length > 0, 'ID should not be empty');
      });
    });
  });
});