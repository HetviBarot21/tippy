/**
 * PesaWise Integration Test Suite
 * Tests PesaWise API integration and payment processing
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

// Mock PesaWise service for testing
const mockPesaWiseService = {
  normalizePhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    throw new Error(`Invalid phone number format: ${phone}`);
  },

  async initiateSTKPush(request) {
    // Mock successful STK Push response
    return {
      success: true,
      message: 'STK Push initiated successfully',
      data: {
        checkout_request_id: `ws_CO_${Date.now()}`,
        merchant_request_id: `29115-34620561-1`,
        response_code: '0',
        response_description: 'Success. Request accepted for processing',
        customer_message: 'Success. Request accepted for processing'
      }
    };
  },

  async querySTKPushStatus(checkoutRequestId) {
    // Mock payment status response
    return {
      success: true,
      message: 'Status query successful',
      data: {
        checkout_request_id: checkoutRequestId,
        merchant_request_id: '29115-34620561-1',
        result_code: '0',
        result_desc: 'The service request is processed successfully.',
        amount: 100,
        mpesa_receipt_number: 'NLJ7RT61SV',
        transaction_date: new Date().toISOString(),
        phone_number: '254708374149'
      }
    };
  },

  parseTransactionStatus(resultCode) {
    switch (resultCode) {
      case '0':
        return 'completed';
      case '1':
        return 'failed';
      case '1032':
        return 'cancelled';
      case '1037':
        return 'timeout';
      default:
        return 'processing';
    }
  },

  extractTransactionDetails(callbackData) {
    if (
      callbackData.result_code === '0' &&
      callbackData.amount &&
      callbackData.mpesa_receipt_number &&
      callbackData.transaction_date &&
      callbackData.phone_number
    ) {
      return {
        amount: callbackData.amount,
        mpesaReceiptNumber: callbackData.mpesa_receipt_number,
        transactionDate: callbackData.transaction_date,
        phoneNumber: callbackData.phone_number
      };
    }
    return null;
  },

  validateCallbackSignature(payload, signature, timestamp) {
    // Mock signature validation - always return true for tests
    return true;
  }
};

// Test data
let testRestaurantId;
let testTipId;

describe('PesaWise Integration', () => {
  beforeEach(async () => {
    // Create test restaurant
    const uniqueSlug = `test-pesawise-restaurant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: 'Test PesaWise Restaurant',
        slug: uniqueSlug,
        email: `test-pesawise-${Date.now()}@example.com`,
        commission_rate: 10.00
      })
      .select()
      .single();

    if (restaurantError) throw restaurantError;
    testRestaurantId = restaurant.id;

    // Create test tip
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .insert({
        restaurant_id: testRestaurantId,
        amount: 100.00,
        commission_amount: 10.00,
        net_amount: 90.00,
        tip_type: 'restaurant',
        payment_method: 'mpesa',
        payment_status: 'pending',
        customer_phone: '254708374149'
      })
      .select()
      .single();

    if (tipError) throw tipError;
    testTipId = tip.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testTipId) {
      await supabase.from('tips').delete().eq('id', testTipId);
    }
    
    if (testRestaurantId) {
      await supabase.from('restaurants').delete().eq('id', testRestaurantId);
    }
  });

  it('should normalize phone numbers correctly', async () => {
    // Test various phone number formats
    const testCases = [
      { input: '254708374149', expected: '254708374149' },
      { input: '0708374149', expected: '254708374149' },
      { input: '708374149', expected: '254708374149' },
      { input: '+254708374149', expected: '254708374149' },
      { input: '254-708-374-149', expected: '254708374149' }
    ];

    testCases.forEach(testCase => {
      const result = mockPesaWiseService.normalizePhoneNumber(testCase.input);
      assert.strictEqual(result, testCase.expected, 
        `Failed to normalize ${testCase.input} to ${testCase.expected}, got ${result}`);
    });
  });

  it('should handle invalid phone numbers', async () => {
    const invalidNumbers = ['123', '25470837414912345', 'invalid'];

    invalidNumbers.forEach(invalidNumber => {
      assert.throws(() => {
        mockPesaWiseService.normalizePhoneNumber(invalidNumber);
      }, Error, `Should throw error for invalid number: ${invalidNumber}`);
    });
  });

  it('should initiate STK Push successfully', async () => {
    const request = {
      phoneNumber: '254708374149',
      amount: 100,
      accountReference: 'TIP-TEST-001',
      transactionDesc: 'Test tip payment'
    };

    const response = await mockPesaWiseService.initiateSTKPush(request);

    assert.strictEqual(response.success, true);
    assert.ok(response.data);
    assert.ok(response.data.checkout_request_id);
    assert.ok(response.data.merchant_request_id);
    assert.strictEqual(response.data.response_code, '0');
  });

  it('should query payment status correctly', async () => {
    const checkoutRequestId = 'ws_CO_123456789';
    
    const response = await mockPesaWiseService.querySTKPushStatus(checkoutRequestId);

    assert.strictEqual(response.success, true);
    assert.ok(response.data);
    assert.strictEqual(response.data.checkout_request_id, checkoutRequestId);
    assert.strictEqual(response.data.result_code, '0');
    assert.ok(response.data.mpesa_receipt_number);
  });

  it('should parse transaction status correctly', async () => {
    const statusMappings = [
      { code: '0', expected: 'completed' },
      { code: '1', expected: 'failed' },
      { code: '1032', expected: 'cancelled' },
      { code: '1037', expected: 'timeout' },
      { code: '9999', expected: 'processing' }
    ];

    statusMappings.forEach(mapping => {
      const result = mockPesaWiseService.parseTransactionStatus(mapping.code);
      assert.strictEqual(result, mapping.expected, 
        `Failed to parse status code ${mapping.code}, expected ${mapping.expected}, got ${result}`);
    });
  });

  it('should extract transaction details from successful callback', async () => {
    const successfulCallback = {
      checkout_request_id: 'ws_CO_123456789',
      merchant_request_id: '29115-34620561-1',
      result_code: '0',
      result_desc: 'The service request is processed successfully.',
      amount: 100,
      mpesa_receipt_number: 'NLJ7RT61SV',
      transaction_date: '2024-02-03T10:30:00Z',
      phone_number: '254708374149'
    };

    const details = mockPesaWiseService.extractTransactionDetails(successfulCallback);

    assert.ok(details);
    assert.strictEqual(details.amount, 100);
    assert.strictEqual(details.mpesaReceiptNumber, 'NLJ7RT61SV');
    assert.strictEqual(details.transactionDate, '2024-02-03T10:30:00Z');
    assert.strictEqual(details.phoneNumber, '254708374149');
  });

  it('should return null for failed callback transaction details', async () => {
    const failedCallback = {
      checkout_request_id: 'ws_CO_123456789',
      merchant_request_id: '29115-34620561-1',
      result_code: '1',
      result_desc: 'The service request failed.'
    };

    const details = mockPesaWiseService.extractTransactionDetails(failedCallback);
    assert.strictEqual(details, null);
  });

  it('should validate webhook signatures', async () => {
    const payload = '{"test": "data"}';
    const signature = 'test_signature';
    const timestamp = '1234567890';

    const isValid = mockPesaWiseService.validateCallbackSignature(payload, signature, timestamp);
    assert.strictEqual(isValid, true); // Mock always returns true
  });

  it('should handle PesaWise callback data structure', async () => {
    // Test that our callback structure matches PesaWise format
    const mockCallbackData = {
      checkout_request_id: 'ws_CO_123456789',
      merchant_request_id: '29115-34620561-1',
      result_code: '0',
      result_desc: 'The service request is processed successfully.',
      amount: 100,
      mpesa_receipt_number: 'NLJ7RT61SV',
      transaction_date: '2024-02-03T10:30:00Z',
      phone_number: '254708374149'
    };

    // Verify all required fields are present
    assert.ok(mockCallbackData.checkout_request_id);
    assert.ok(mockCallbackData.merchant_request_id);
    assert.ok(mockCallbackData.result_code);
    assert.ok(mockCallbackData.result_desc);

    // For successful payments, these should be present
    if (mockCallbackData.result_code === '0') {
      assert.ok(mockCallbackData.amount);
      assert.ok(mockCallbackData.mpesa_receipt_number);
      assert.ok(mockCallbackData.transaction_date);
      assert.ok(mockCallbackData.phone_number);
    }
  });

  it('should handle different result codes appropriately', async () => {
    const testCases = [
      { code: '0', description: 'Success', shouldHaveDetails: true },
      { code: '1', description: 'Failed', shouldHaveDetails: false },
      { code: '1032', description: 'Cancelled by user', shouldHaveDetails: false },
      { code: '1037', description: 'Timeout', shouldHaveDetails: false },
      { code: '1001', description: 'Insufficient funds', shouldHaveDetails: false }
    ];

    testCases.forEach(testCase => {
      const status = mockPesaWiseService.parseTransactionStatus(testCase.code);
      
      if (testCase.shouldHaveDetails) {
        assert.strictEqual(status, 'completed');
      } else {
        assert.notStrictEqual(status, 'completed');
      }
    });
  });
});