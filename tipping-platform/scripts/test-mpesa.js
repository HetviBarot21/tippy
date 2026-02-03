/**
 * Manual M-Pesa Testing Script
 * Use this script to manually test M-Pesa integration with various scenarios
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testPhone: '254708374149' // Safaricom test number
};

// Create Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test scenarios
const testScenarios = {
  // Phone number format tests
  phoneFormats: [
    '254708374149',  // Standard format
    '0708374149',    // Local format
    '+254708374149', // International format
    '254 708 374 149', // With spaces
    '254-708-374-149'  // With dashes
  ],

  // Amount tests
  amounts: [
    10,    // Minimum
    50,    // Small tip
    100,   // Medium tip
    500,   // Large tip
    1000   // Very large tip
  ],

  // Error scenarios
  errorScenarios: [
    { phone: '123456789', amount: 100, expectedError: 'phone number' },
    { phone: '254708374149', amount: 5, expectedError: 'Minimum tip' },
    { phone: '254708374149', amount: 15000, expectedError: 'Maximum tip' },
    { phone: '', amount: 100, expectedError: 'required' }
  ]
};

// Utility functions
async function findTestRestaurant() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, waiters(*), qr_codes(*)')
    .eq('name', 'Test Restaurant')
    .single();

  if (error || !data) {
    console.log('Creating test restaurant...');
    return await createTestRestaurant();
  }

  return data;
}

async function createTestRestaurant() {
  // Create restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({
      name: 'Test Restaurant',
      slug: `test-restaurant-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      commission_rate: 10.0
    })
    .select()
    .single();

  if (restaurantError) throw restaurantError;

  // Create waiter
  const { data: waiter, error: waiterError } = await supabase
    .from('waiters')
    .insert({
      restaurant_id: restaurant.id,
      name: 'Test Waiter',
      phone_number: '254700000000'
    })
    .select()
    .single();

  if (waiterError) throw waiterError;

  // Create QR code
  const { data: qrCode, error: qrError } = await supabase
    .from('qr_codes')
    .insert({
      restaurant_id: restaurant.id,
      table_number: 'T01',
      table_name: 'Test Table 1',
      qr_data: JSON.stringify({ restaurantId: restaurant.id, tableId: 'test-table' })
    })
    .select()
    .single();

  if (qrError) throw qrError;

  return {
    ...restaurant,
    waiters: [waiter],
    qr_codes: [qrCode]
  };
}

async function testMPesaConnection() {
  console.log('\n🔗 Testing M-Pesa Connection...');
  
  try {
    const response = await fetch(`${config.baseUrl}/api/mpesa/test`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ M-Pesa connection successful');
      console.log(`   Environment: ${result.environment}`);
    } else {
      console.log('❌ M-Pesa connection failed:', result.message);
    }
  } catch (error) {
    console.log('❌ Connection test error:', error.message);
  }
}

async function testPhoneNumberFormats(restaurant) {
  console.log('\n📱 Testing Phone Number Formats...');
  
  for (const phone of testScenarios.phoneFormats) {
    try {
      const tipRequest = {
        amount: 100,
        tipType: 'waiter',
        restaurantId: restaurant.id,
        waiterId: restaurant.waiters[0].id,
        tableId: restaurant.qr_codes[0].id,
        paymentMethod: 'mpesa',
        customerPhone: phone
      };

      const response = await fetch(`${config.baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tipRequest)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${phone} - STK Push initiated: ${result.stkPushId}`);
      } else {
        console.log(`❌ ${phone} - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${phone} - Request failed: ${error.message}`);
    }
  }
}

async function testAmountValidation(restaurant) {
  console.log('\n💰 Testing Amount Validation...');
  
  for (const amount of testScenarios.amounts) {
    try {
      const tipRequest = {
        amount,
        tipType: 'restaurant',
        restaurantId: restaurant.id,
        tableId: restaurant.qr_codes[0].id,
        paymentMethod: 'mpesa',
        customerPhone: config.testPhone
      };

      const response = await fetch(`${config.baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tipRequest)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ KES ${amount} - STK Push initiated: ${result.stkPushId}`);
      } else {
        console.log(`❌ KES ${amount} - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ KES ${amount} - Request failed: ${error.message}`);
    }
  }
}

async function testErrorScenarios(restaurant) {
  console.log('\n🚨 Testing Error Scenarios...');
  
  for (const scenario of testScenarios.errorScenarios) {
    try {
      const tipRequest = {
        amount: scenario.amount,
        tipType: 'restaurant',
        restaurantId: restaurant.id,
        tableId: restaurant.qr_codes[0].id,
        paymentMethod: 'mpesa',
        customerPhone: scenario.phone
      };

      const response = await fetch(`${config.baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tipRequest)
      });

      const result = await response.json();
      
      if (!response.ok && result.error.toLowerCase().includes(scenario.expectedError.toLowerCase())) {
        console.log(`✅ Expected error for ${scenario.phone || 'empty'} / ${scenario.amount}: ${result.error}`);
      } else if (response.ok) {
        console.log(`❌ Expected error but got success for ${scenario.phone || 'empty'} / ${scenario.amount}`);
      } else {
        console.log(`⚠️  Unexpected error for ${scenario.phone || 'empty'} / ${scenario.amount}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Request failed for ${scenario.phone || 'empty'} / ${scenario.amount}: ${error.message}`);
    }
  }
}

async function testWebhookEndpoints() {
  console.log('\n🔗 Testing Webhook Endpoints...');
  
  // Test callback endpoint
  try {
    const response = await fetch(`${config.baseUrl}/api/webhooks/mpesa/callback`);
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Callback endpoint is active');
    } else {
      console.log('❌ Callback endpoint error:', result.message);
    }
  } catch (error) {
    console.log('❌ Callback endpoint test failed:', error.message);
  }

  // Test timeout endpoint
  try {
    const response = await fetch(`${config.baseUrl}/api/webhooks/mpesa/timeout`);
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Timeout endpoint is active');
    } else {
      console.log('❌ Timeout endpoint error:', result.message);
    }
  } catch (error) {
    console.log('❌ Timeout endpoint test failed:', error.message);
  }
}

async function simulateWebhookCallback(tipId, scenario = 'success') {
  console.log(`\n📨 Simulating ${scenario} webhook callback for tip ${tipId}...`);
  
  const callbackData = {
    success: {
      Body: {
        stkCallback: {
          MerchantRequestID: 'test-merchant-123',
          CheckoutRequestID: tipId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: 'TEST123456' },
              { Name: 'TransactionDate', Value: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14) },
              { Name: 'PhoneNumber', Value: config.testPhone }
            ]
          }
        }
      }
    },
    failure: {
      Body: {
        stkCallback: {
          MerchantRequestID: 'test-merchant-123',
          CheckoutRequestID: tipId,
          ResultCode: 1,
          ResultDesc: 'Insufficient balance'
        }
      }
    },
    cancelled: {
      Body: {
        stkCallback: {
          MerchantRequestID: 'test-merchant-123',
          CheckoutRequestID: tipId,
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user'
        }
      }
    }
  };

  try {
    const response = await fetch(`${config.baseUrl}/api/webhooks/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData[scenario])
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${scenario} callback processed successfully`);
      
      // Check tip status
      const { data: tip } = await supabase
        .from('tips')
        .select('payment_status, metadata')
        .eq('transaction_id', tipId)
        .single();
      
      if (tip) {
        console.log(`   Tip status: ${tip.payment_status}`);
      }
    } else {
      console.log(`❌ ${scenario} callback failed:`, result.error);
    }
  } catch (error) {
    console.log(`❌ ${scenario} callback error:`, error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 M-Pesa Integration Test Suite');
  console.log('================================');
  
  try {
    // Setup
    const restaurant = await findTestRestaurant();
    console.log(`📍 Using restaurant: ${restaurant.name} (${restaurant.id})`);
    
    // Run tests
    await testMPesaConnection();
    await testWebhookEndpoints();
    await testPhoneNumberFormats(restaurant);
    await testAmountValidation(restaurant);
    await testErrorScenarios(restaurant);
    
    console.log('\n✅ All tests completed!');
    console.log('\n💡 To test actual STK Push:');
    console.log(`   1. Use phone number: ${config.testPhone}`);
    console.log('   2. Check your phone for M-Pesa prompt');
    console.log('   3. Enter PIN to complete payment');
    console.log('   4. Check webhook logs for callback processing');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'connection':
      testMPesaConnection();
      break;
    case 'webhook':
      testWebhookEndpoints();
      break;
    case 'simulate':
      const tipId = process.argv[3];
      const scenario = process.argv[4] || 'success';
      if (tipId) {
        simulateWebhookCallback(tipId, scenario);
      } else {
        console.log('Usage: node test-mpesa.js simulate <tipId> [success|failure|cancelled]');
      }
      break;
    default:
      runTests();
  }
}

module.exports = {
  testMPesaConnection,
  testPhoneNumberFormats,
  testAmountValidation,
  testErrorScenarios,
  testWebhookEndpoints,
  simulateWebhookCallback,
  runTests
};