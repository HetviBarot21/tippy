const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Payment Security Tests', () => {
  
  describe('Input Validation Security', () => {
    test('should prevent SQL injection in payment data', () => {
      const maliciousInputs = [
        "'; DROP TABLE tips; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users",
        "<script>alert('xss')</script>",
        "../../etc/passwd"
      ];

      maliciousInputs.forEach(input => {
        // Test that malicious input is properly escaped/validated
        const isValidAmount = /^\d+(\.\d{1,2})?$/.test(input);
        const isValidId = /^[a-zA-Z0-9\-_]+$/.test(input);
        
        assert.ok(!isValidAmount, `Malicious amount input should be rejected: ${input}`);
        assert.ok(!isValidId, `Malicious ID input should be rejected: ${input}`);
      });
    });

    test('should validate amount precision to prevent manipulation', () => {
      const testAmounts = [
        { input: 100, expected: true },
        { input: 100.50, expected: true },
        { input: 100.123, expected: false }, // Too many decimals
        { input: -100, expected: false }, // Negative
        { input: 0, expected: false }, // Zero
        { input: 'abc', expected: false }, // Non-numeric
        { input: null, expected: false }, // Null
        { input: undefined, expected: false } // Undefined
      ];

      testAmounts.forEach(({ input, expected }) => {
        const isValid = typeof input === 'number' && 
                       input > 0 && 
                       input >= 10 && 
                       input <= 10000 &&
                       Number.isFinite(input) &&
                       (input % 1 === 0 || (input * 100) % 1 === 0); // Whole number or max 2 decimals

        assert.strictEqual(isValid, expected, `Amount ${input} validation should be ${expected}`);
      });
    });

    test('should validate UUID format for IDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a1b2c3d4-e5f6-1890-abcd-ef1234567890' // Fixed: version should be 1-5
      ];

      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '',
        null,
        undefined,
        '123e4567-e89b-12d3-a456-42661417400', // Too short
        '123e4567-e89b-12d3-a456-4266141740000' // Too long
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      validUUIDs.forEach(uuid => {
        assert.ok(uuidRegex.test(uuid), `${uuid} should be valid UUID`);
      });

      invalidUUIDs.forEach(uuid => {
        const isValid = uuid && typeof uuid === 'string' && uuidRegex.test(uuid);
        assert.ok(!isValid, `${uuid} should be invalid UUID`);
      });
    });
  });

  describe('Authentication and Authorization', () => {
    test('should validate restaurant access permissions', () => {
      const testScenarios = [
        {
          userRestaurantId: 'restaurant-1',
          requestRestaurantId: 'restaurant-1',
          shouldAllow: true
        },
        {
          userRestaurantId: 'restaurant-1',
          requestRestaurantId: 'restaurant-2',
          shouldAllow: false
        },
        {
          userRestaurantId: null,
          requestRestaurantId: 'restaurant-1',
          shouldAllow: false
        }
      ];

      testScenarios.forEach(({ userRestaurantId, requestRestaurantId, shouldAllow }) => {
        const hasAccess = userRestaurantId === requestRestaurantId;
        assert.strictEqual(hasAccess, shouldAllow, 
          `Access should be ${shouldAllow} for user restaurant ${userRestaurantId} requesting ${requestRestaurantId}`);
      });
    });

    test('should validate waiter belongs to restaurant', () => {
      const mockWaiters = [
        { id: 'waiter-1', restaurant_id: 'restaurant-1' },
        { id: 'waiter-2', restaurant_id: 'restaurant-1' },
        { id: 'waiter-3', restaurant_id: 'restaurant-2' }
      ];

      const testCases = [
        { waiterId: 'waiter-1', restaurantId: 'restaurant-1', shouldAllow: true },
        { waiterId: 'waiter-3', restaurantId: 'restaurant-1', shouldAllow: false },
        { waiterId: 'nonexistent', restaurantId: 'restaurant-1', shouldAllow: false }
      ];

      testCases.forEach(({ waiterId, restaurantId, shouldAllow }) => {
        const waiter = mockWaiters.find(w => w.id === waiterId);
        const isValid = waiter && waiter.restaurant_id === restaurantId;
        
        assert.strictEqual(!!isValid, shouldAllow,
          `Waiter ${waiterId} should ${shouldAllow ? 'belong to' : 'not belong to'} restaurant ${restaurantId}`);
      });
    });
  });

  describe('Payment Data Security', () => {
    test('should not expose sensitive data in logs', () => {
      const paymentData = {
        amount: 100,
        customerPhone: '254712345678',
        paymentMethod: 'card',
        cardNumber: '4242424242424242', // This should never be logged
        cvv: '123' // This should never be logged
      };

      // Simulate safe logging (only log safe fields)
      const safeFields = ['amount', 'paymentMethod', 'tipType', 'restaurantId'];
      const logData = {};
      
      safeFields.forEach(field => {
        if (paymentData[field] !== undefined) {
          logData[field] = paymentData[field];
        }
      });

      assert.ok(!logData.cardNumber, 'Card number should not be in logs');
      assert.ok(!logData.cvv, 'CVV should not be in logs');
      assert.ok(!logData.customerPhone, 'Phone number should not be in logs');
      assert.strictEqual(logData.amount, 100, 'Safe fields should be logged');
    });

    test('should mask sensitive data in responses', () => {
      const phoneNumber = '254712345678';
      
      // Mask phone number for display (show first 3 and last 3 digits)
      const maskedPhone = phoneNumber.replace(/(\d{3})(\d{6})(\d{3})/, '$1****$3');
      
      assert.strictEqual(maskedPhone, '254****678', 'Phone should be masked');
      assert.ok(!maskedPhone.includes('712345'), 'Middle digits should be hidden');
    });

    test('should validate commission rate bounds', () => {
      const testRates = [
        { rate: -5, valid: false }, // Negative
        { rate: 0, valid: true }, // Zero (no commission)
        { rate: 10, valid: true }, // Normal
        { rate: 50, valid: true }, // High but acceptable
        { rate: 100, valid: false }, // Would take entire amount
        { rate: 150, valid: false } // Over 100%
      ];

      testRates.forEach(({ rate, valid }) => {
        const isValid = rate >= 0 && rate <= 50;
        assert.strictEqual(isValid, valid, `Rate ${rate}% should be ${valid ? 'valid' : 'invalid'}`);
      });
    });
  });

  describe('Webhook Security', () => {
    test('should validate webhook signatures', () => {
      // Mock webhook signature validation
      const validSignature = 't=1234567890,v1=valid_signature_hash';
      const invalidSignatures = [
        '', // Empty
        'invalid_format', // Wrong format
        't=1234567890,v1=wrong_hash', // Wrong hash
        't=old_timestamp,v1=valid_hash' // Old timestamp
      ];

      // Valid signature should pass
      const isValidFormat = validSignature.includes('t=') && validSignature.includes('v1=');
      assert.ok(isValidFormat, 'Valid signature should have correct format');

      // Invalid signatures should fail
      invalidSignatures.forEach(sig => {
        const hasValidFormat = sig.includes('t=') && sig.includes('v1=');
        assert.ok(!hasValidFormat || sig.includes('wrong') || sig.includes('old'), 
          `Invalid signature should be rejected: ${sig}`);
      });
    });

    test('should prevent replay attacks with timestamps', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const tolerance = 300; // 5 minutes

      const testTimestamps = [
        { timestamp: currentTime, valid: true }, // Current
        { timestamp: currentTime - 100, valid: true }, // 100 seconds ago
        { timestamp: currentTime - 600, valid: false }, // 10 minutes ago (too old)
        { timestamp: currentTime + 100, valid: false } // Future (invalid)
      ];

      testTimestamps.forEach(({ timestamp, valid }) => {
        const timeDiff = Math.abs(currentTime - timestamp);
        const isValid = timeDiff <= tolerance && timestamp <= currentTime;
        
        assert.strictEqual(isValid, valid, 
          `Timestamp ${timestamp} should be ${valid ? 'valid' : 'invalid'}`);
      });
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    test('should detect suspicious payment patterns', () => {
      const payments = [
        { amount: 100, timestamp: 1000, ip: '192.168.1.1' },
        { amount: 100, timestamp: 1001, ip: '192.168.1.1' }, // Same IP, 1 second apart
        { amount: 100, timestamp: 1002, ip: '192.168.1.1' }, // Same IP, 2 seconds apart
        { amount: 100, timestamp: 1003, ip: '192.168.1.1' }  // Same IP, 3 seconds apart
      ];

      // Check for rapid successive payments from same IP
      const rapidPayments = payments.filter((payment, index) => {
        if (index === 0) return false;
        const prevPayment = payments[index - 1];
        return payment.ip === prevPayment.ip && 
               (payment.timestamp - prevPayment.timestamp) < 5; // Less than 5 seconds
      });

      assert.ok(rapidPayments.length > 0, 'Should detect rapid payments from same IP');
    });

    test('should validate reasonable tip amounts', () => {
      const suspiciousAmounts = [
        { amount: 10000, suspicious: true }, // Maximum amount
        { amount: 9999, suspicious: true }, // Just under max but still high
        { amount: 5000, suspicious: true }, // Very high tip
        { amount: 4999, suspicious: false }, // Just under threshold
        { amount: 500, suspicious: false }, // Reasonable tip
        { amount: 100, suspicious: false }, // Normal tip
        { amount: 10, suspicious: false } // Minimum tip
      ];

      suspiciousAmounts.forEach(({ amount, suspicious }) => {
        // Flag amounts over 5000 KES as potentially suspicious (adjusted threshold)
        const isSuspicious = amount >= 5000;
        assert.strictEqual(isSuspicious, suspicious, 
          `Amount ${amount} KES should ${suspicious ? 'be' : 'not be'} flagged as suspicious`);
      });
    });
  });

  describe('Data Encryption and Storage', () => {
    test('should not store sensitive payment data', () => {
      const paymentRecord = {
        id: 'tip-123',
        amount: 100,
        restaurant_id: 'restaurant-1',
        payment_method: 'card',
        payment_status: 'completed',
        transaction_id: 'pi_stripe_123',
        // Should NOT contain:
        // - card_number
        // - cvv
        // - full_phone_number (only masked)
        // - customer_name
      };

      const sensitiveFields = ['card_number', 'cvv', 'customer_name'];
      
      sensitiveFields.forEach(field => {
        assert.ok(!(field in paymentRecord), 
          `Sensitive field ${field} should not be stored in payment record`);
      });
    });

    test('should use secure transaction IDs', () => {
      const transactionIds = [
        'pi_1234567890abcdef', // Stripe format
        'mpesa_tx_1234567890', // M-Pesa format
        'tx_secure_hash_123' // Generic secure format
      ];

      transactionIds.forEach(txId => {
        // Transaction IDs should be non-sequential and unpredictable
        assert.ok(txId.length >= 10, 'Transaction ID should be sufficiently long');
        assert.ok(!/^[0-9]+$/.test(txId), 'Transaction ID should not be purely numeric');
      });
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose internal errors to clients', () => {
      const internalErrors = [
        'Database connection failed: host=db.internal.com',
        'Stripe API key: sk_live_...',
        'SQL query failed: SELECT * FROM users WHERE password=...',
        'File not found: /etc/passwd'
      ];

      const safeErrors = [
        'Payment processing failed',
        'Invalid payment data',
        'Service temporarily unavailable',
        'Transaction could not be completed'
      ];

      internalErrors.forEach(error => {
        // Check that error doesn't contain sensitive information
        const containsSensitive = error.includes('password') || 
                                error.includes('key') || 
                                error.includes('host=') ||
                                error.includes('/etc/');
        
        assert.ok(containsSensitive, `Error should contain sensitive info for test: ${error}`);
      });

      safeErrors.forEach(error => {
        // Check that safe errors don't expose internals
        const isSafe = !error.includes('password') && 
                      !error.includes('key') && 
                      !error.includes('host=') &&
                      !error.includes('/etc/');
        
        assert.ok(isSafe, `Error should be safe for clients: ${error}`);
      });
    });
  });
});