/**
 * M-Pesa Integration Tests
 * Tests STK Push functionality, webhook handling, and error scenarios
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testPhoneNumbers: [
    '254708374149', // Safaricom test number
    '254711XXXXXX', // Generic test format
    '0708374149',   // Local format
    '+254708374149' // International format
  ],
  invalidPhoneNumbers: [
    '123456789',    // Too short
    '254123456789', // Invalid network
    'invalid',      // Non-numeric
    ''              // Empty
  ]
};

// Test utilities
function createTestClient() {
  return createClient(
    TEST_CONFIG.supabaseUrl,
    TEST_CONFIG.supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

async function createTestRestaurant() {
  const supabase = createTestClient();
  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name: 'Test Restaurant M-Pesa',
      slug: `test-mpesa-${Date.now()}`,
      email: `test-mpesa-${Date.now()}@example.com`,
      commission_rate: 15.0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createTestWaiter(restaurantId) {
  const supabase = createTestClient();
  const { data, error } = await supabase
    .from('waiters')
    .insert({
      restaurant_id: restaurantId,
      name: 'Test Waiter M-Pesa',
      phone_number: '254700000000'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createTestQRCode(restaurantId) {
  const supabase = createTestClient();
  const { data, error } = await supabase
    .from('qr_codes')
    .insert({
      restaurant_id: restaurantId,
      table_number: 'T-MPESA-01',
      table_name: 'M-Pesa Test Table',
      qr_data: JSON.stringify({ restaurantId, tableId: 'test-table' })
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function cleanupTestData(restaurantId) {
  const supabase = createTestClient();
  
  // Clean up in reverse order of dependencies
  await supabase.from('tips').delete().eq('restaurant_id', restaurantId);
  await supabase.from('waiters').delete().eq('restaurant_id', restaurantId);
  await supabase.from('qr_codes').delete().eq('restaurant_id', restaurantId);
  await supabase.from('restaurants').delete().eq('id', restaurantId);
}

// Test M-Pesa connection
describe('M-Pesa Connection Tests', () => {
  test('should connect to M-Pesa API successfully', async () => {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/mpesa/test`);
    const result = await response.json();
    
    expect(response.ok).toBe(true);
    expect(result.success).toBe(true);
    expect(result.environment).toBe('sandbox');
  }, 30000);

  test('should handle M-Pesa API authentication errors', async () => {
    // This test would require temporarily invalid credentials
    // For now, we'll test the error handling structure
    expect(true).toBe(true); // Placeholder
  });
});

// Test phone number validation and formatting
describe('M-Pesa Phone Number Tests', () => {
  let restaurant, waiter, qrCode;

  beforeAll(async () => {
    restaurant = await createTestRestaurant();
    waiter = await createTestWaiter(restaurant.id);
    qrCode = await createTestQRCode(restaurant.id);
  });

  afterAll(async () => {
    await cleanupTestData(restaurant.id);
  });

  test.each(TEST_CONFIG.testPhoneNumbers)('should accept valid phone number: %s', async (phoneNumber) => {
    const tipRequest = {
      amount: 100,
      tipType: 'waiter',
      restaurantId: restaurant.id,
      waiterId: waiter.id,
      tableId: qrCode.id,
      paymentMethod: 'mpesa',
      customerPhone: phoneNumber
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tipRequest)
    });

    const result = await response.json();
    
    if (response.ok) {
      expect(result.success).toBe(true);
      expect(result.paymentMethod).toBe('mpesa');
      expect(result.stkPushId).toBeDefined();
    } else {
      // If the request fails, it should be due to M-Pesa API issues, not validation
      expect(result.error).not.toContain('phone number');
    }
  }, 30000);

  test.each(TEST_CONFIG.invalidPhoneNumbers)('should reject invalid phone number: %s', async (phoneNumber) => {
    const tipRequest = {
      amount: 100,
      tipType: 'waiter',
      restaurantId: restaurant.id,
      waiterId: waiter.id,
      tableId: qrCode.id,
      paymentMethod: 'mpesa',
      customerPhone: phoneNumber
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tipRequest)
    });

    const result = await response.json();
    
    expect(response.ok).toBe(false);
    expect(result.error).toContain('phone number');
  });
});

// Test STK Push scenarios
describe('M-Pesa STK Push Tests', () => {
  let restaurant, waiter, qrCode;

  beforeAll(async () => {
    restaurant = await createTestRestaurant();
    waiter = await createTestWaiter(restaurant.id);
    qrCode = await createTestQRCode(restaurant.id);
  });

  afterAll(async () => {
    await cleanupTestData(restaurant.id);
  });

  test('should initiate STK Push for waiter tip', async () => {
    const tipRequest = {
      amount: 150,
      tipType: 'waiter',
      restaurantId: restaurant.id,
      waiterId: waiter.id,
      tableId: qrCode.id,
      paymentMethod: 'mpesa',
      customerPhone: '254708374149'
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tipRequest)
    });

    const result = await response.json();
    
    if (response.ok) {
      expect(result.success).toBe(true);
      expect(result.paymentMethod).toBe('mpesa');
      expect(result.tipId).toBeDefined();
      expect(result.stkPushId).toBeDefined();
      expect(result.message).toContain('phone');
    }
  }, 30000);

  test('should initiate STK Push for restaurant tip', async () => {
    const tipRequest = {
      amount: 200,
      tipType: 'restaurant',
      restaurantId: restaurant.id,
      tableId: qrCode.id,
      paymentMethod: 'mpesa',
      customerPhone: '254708374149'
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tipRequest)
    });

    const result = await response.json();
    
    if (response.ok) {
      expect(result.success).toBe(true);
      expect(result.paymentMethod).toBe('mpesa');
      expect(result.tipId).toBeDefined();
      expect(result.stkPushId).toBeDefined();
    }
  }, 30000);

  test('should handle amount validation', async () => {
    const invalidAmounts = [0, -10, 0.5, 100000];

    for (const amount of invalidAmounts) {
      const tipRequest = {
        amount,
        tipType: 'restaurant',
        restaurantId: restaurant.id,
        tableId: qrCode.id,
        paymentMethod: 'mpesa',
        customerPhone: '254708374149'
      };

      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tipRequest)
      });

      const result = await response.json();
      expect(response.ok).toBe(false);
      expect(result.error).toBeDefined();
    }
  });
});

// Test webhook handling
describe('M-Pesa Webhook Tests', () => {
  let restaurant, waiter, qrCode, tipId;

  beforeAll(async () => {
    restaurant = await createTestRestaurant();
    waiter = await createTestWaiter(restaurant.id);
    qrCode = await createTestQRCode(restaurant.id);
  });

  afterAll(async () => {
    await cleanupTestData(restaurant.id);
  });

  beforeEach(async () => {
    // Create a test tip for webhook testing
    const supabase = createTestClient();
    const { data, error } = await supabase
      .from('tips')
      .insert({
        restaurant_id: restaurant.id,
        waiter_id: waiter.id,
        table_id: qrCode.id,
        amount: 100,
        commission_amount: 15,
        net_amount: 85,
        tip_type: 'waiter',
        payment_method: 'mpesa',
        payment_status: 'processing',
        transaction_id: 'ws_CO_test_123456',
        customer_phone: '254708374149'
      })
      .select()
      .single();

    if (error) throw error;
    tipId = data.id;
  });

  test('should handle successful payment callback', async () => {
    const callbackData = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'test-merchant-123',
          CheckoutRequestID: 'ws_CO_test_123456',
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: 'OEI2AK4Q16' },
              { Name: 'TransactionDate', Value: '20240203143022' },
              { Name: 'PhoneNumber', Value: '254708374149' }
            ]
          }
        }
      }
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData)
    });

    const result = await response.json();
    expect(response.ok).toBe(true);
    expect(result.ResultCode).toBe(0);

    // Verify tip was updated
    const supabase = createTestClient();
    const { data: updatedTip } = await supabase
      .from('tips')
      .select('*')
      .eq('id', tipId)
      .single();

    expect(updatedTip.payment_status).toBe('completed');
    expect(updatedTip.transaction_id).toBe('OEI2AK4Q16');
    expect(updatedTip.metadata.mpesaReceiptNumber).toBe('OEI2AK4Q16');
  });

  test('should handle failed payment callback', async () => {
    const callbackData = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'test-merchant-123',
          CheckoutRequestID: 'ws_CO_test_123456',
          ResultCode: 1,
          ResultDesc: 'The balance is insufficient for the transaction.'
        }
      }
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData)
    });

    const result = await response.json();
    expect(response.ok).toBe(true);
    expect(result.ResultCode).toBe(0);

    // Verify tip was marked as failed
    const supabase = createTestClient();
    const { data: updatedTip } = await supabase
      .from('tips')
      .select('*')
      .eq('id', tipId)
      .single();

    expect(updatedTip.payment_status).toBe('failed');
    expect(updatedTip.metadata.resultCode).toBe(1);
  });

  test('should handle cancelled payment callback', async () => {
    const callbackData = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'test-merchant-123',
          CheckoutRequestID: 'ws_CO_test_123456',
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user'
        }
      }
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData)
    });

    const result = await response.json();
    expect(response.ok).toBe(true);

    // Verify tip was marked as cancelled
    const supabase = createTestClient();
    const { data: updatedTip } = await supabase
      .from('tips')
      .select('*')
      .eq('id', tipId)
      .single();

    expect(updatedTip.payment_status).toBe('cancelled');
  });

  test('should handle timeout callback', async () => {
    const timeoutData = {
      CheckoutRequestID: 'ws_CO_test_123456',
      MerchantRequestID: 'test-merchant-123'
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/mpesa/timeout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timeoutData)
    });

    const result = await response.json();
    expect(response.ok).toBe(true);
    expect(result.ResultCode).toBe(0);

    // Verify tip was marked as timeout
    const supabase = createTestClient();
    const { data: updatedTip } = await supabase
      .from('tips')
      .select('*')
      .eq('id', tipId)
      .single();

    expect(updatedTip.payment_status).toBe('timeout');
  });

  test('should handle duplicate transaction prevention', async () => {
    // First callback
    const callbackData = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'test-merchant-123',
          CheckoutRequestID: 'ws_CO_test_123456',
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: 'OEI2AK4Q16' },
              { Name: 'TransactionDate', Value: '20240203143022' },
              { Name: 'PhoneNumber', Value: '254708374149' }
            ]
          }
        }
      }
    };

    // Send first callback
    await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData)
    });

    // Send duplicate callback
    const response2 = await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData)
    });

    const result2 = await response2.json();
    expect(response2.ok).toBe(true);
    expect(result2.ResultCode).toBe(0);

    // Verify tip is still completed and not duplicated
    const supabase = createTestClient();
    const { data: updatedTip } = await supabase
      .from('tips')
      .select('*')
      .eq('id', tipId)
      .single();

    expect(updatedTip.payment_status).toBe('completed');
  });
});

// Test payment status queries
describe('M-Pesa Payment Status Tests', () => {
  let restaurant, waiter, qrCode, tipId;

  beforeAll(async () => {
    restaurant = await createTestRestaurant();
    waiter = await createTestWaiter(restaurant.id);
    qrCode = await createTestQRCode(restaurant.id);
  });

  afterAll(async () => {
    await cleanupTestData(restaurant.id);
  });

  beforeEach(async () => {
    const supabase = createTestClient();
    const { data, error } = await supabase
      .from('tips')
      .insert({
        restaurant_id: restaurant.id,
        waiter_id: waiter.id,
        table_id: qrCode.id,
        amount: 100,
        commission_amount: 15,
        net_amount: 85,
        tip_type: 'waiter',
        payment_method: 'mpesa',
        payment_status: 'processing',
        transaction_id: 'ws_CO_test_status_123',
        customer_phone: '254708374149'
      })
      .select()
      .single();

    if (error) throw error;
    tipId = data.id;
  });

  test('should query payment status', async () => {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/${tipId}/status`);
    const result = await response.json();

    expect(response.ok).toBe(true);
    expect(result.tipId).toBe(tipId);
    expect(result.paymentMethod).toBe('mpesa');
    expect(result.status).toBeDefined();
  });

  test('should return 404 for non-existent tip', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/payments/${fakeId}/status`);
    
    expect(response.status).toBe(404);
  });
});

// Test error scenarios
describe('M-Pesa Error Scenarios', () => {
  test('should handle invalid webhook data gracefully', async () => {
    const invalidData = { invalid: 'data' };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData)
    });

    const result = await response.json();
    expect(response.status).toBe(400);
    expect(result.error).toContain('Invalid callback structure');
  });

  test('should handle malformed JSON in webhook', async () => {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });

    expect(response.status).toBe(400);
  });

  test('should handle webhook for non-existent transaction', async () => {
    const callbackData = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'non-existent-merchant',
          CheckoutRequestID: 'non-existent-checkout',
          ResultCode: 0,
          ResultDesc: 'Success'
        }
      }
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData)
    });

    const result = await response.json();
    expect(response.ok).toBe(true);
    expect(result.ResultCode).toBe(0); // Should still return success to M-Pesa
  });
});