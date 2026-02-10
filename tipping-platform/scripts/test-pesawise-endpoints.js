/**
 * PesaWise Endpoint Test Script
 * Test PesaWise API endpoints directly (for debugging)
 */

const crypto = require('crypto');

// Test configuration - update these when you get real credentials
const TEST_CONFIG = {
  baseUrl: 'https://sandbox.pesawise.com',
  apiKey: 'your_api_key_here',
  secretKey: 'your_secret_key_here',
  businessShortCode: 'your_short_code_here',
  testPhone: '254700000000',
  testAmount: 10
};

// Generate signature for authentication
function generateSignature(payload, timestamp, secretKey) {
  const stringToSign = `${payload}${timestamp}${secretKey}`;
  return crypto.createHash('sha256').update(stringToSign).digest('hex');
}

// Make authenticated request to PesaWise
async function makeRequest(endpoint, method = 'POST', data = null) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = data ? JSON.stringify(data) : '';
  const signature = generateSignature(payload, timestamp, TEST_CONFIG.secretKey);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Key': TEST_CONFIG.apiKey,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
  };

  console.log(`\n🔗 ${method} ${url}`);
  console.log('📋 Headers:', { 
    ...headers, 
    'X-API-Key': '[REDACTED]', 
    'X-Signature': '[REDACTED]' 
  });
  
  if (data) {
    console.log('📦 Payload:', data);
  }

  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();

    console.log(`📊 Response Status: ${response.status}`);
    console.log('📄 Response Data:', JSON.stringify(responseData, null, 2));

    return {
      success: response.ok,
      status: response.status,
      data: responseData
    };

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test account balance endpoint
async function testAccountBalance() {
  console.log('\n🏦 Testing Account Balance...');
  
  if (TEST_CONFIG.apiKey === 'your_api_key_here') {
    console.log('⚠️  Please update TEST_CONFIG with your real PesaWise credentials');
    return false;
  }

  const result = await makeRequest('/api/v1/account/balance', 'GET');
  
  if (result.success) {
    console.log('✅ Account balance retrieved successfully');
    return true;
  } else {
    console.log('❌ Account balance test failed');
    return false;
  }
}

// Test STK Push endpoint
async function testSTKPush() {
  console.log('\n📱 Testing STK Push...');
  
  if (TEST_CONFIG.apiKey === 'your_api_key_here') {
    console.log('⚠️  Please update TEST_CONFIG with your real PesaWise credentials');
    return null;
  }

  const payload = {
    phone: TEST_CONFIG.testPhone,
    amount: TEST_CONFIG.testAmount,
    reference: `TEST-${Date.now()}`,
    description: 'PesaWise API Test Payment',
    callback_url: 'http://localhost:3000/api/webhooks/pesawise/callback'
  };

  const result = await makeRequest('/api/v1/payments/stk-push', 'POST', payload);
  
  if (result.success && result.data.success) {
    console.log('✅ STK Push initiated successfully');
    console.log('🆔 Checkout Request ID:', result.data.data?.checkout_request_id);
    return result.data.data?.checkout_request_id;
  } else {
    console.log('❌ STK Push test failed');
    return null;
  }
}

// Test payment status query
async function testStatusQuery(checkoutRequestId) {
  if (!checkoutRequestId) {
    console.log('\n⏭️  Skipping status query (no checkout request ID)');
    return;
  }

  console.log('\n🔍 Testing Payment Status Query...');
  
  // Wait a bit before querying
  await new Promise(resolve => setTimeout(resolve, 3000));

  const payload = {
    checkout_request_id: checkoutRequestId
  };

  const result = await makeRequest('/api/v1/payments/status', 'POST', payload);
  
  if (result.success) {
    console.log('✅ Status query successful');
    console.log('📊 Payment Status:', result.data.data?.result_desc);
  } else {
    console.log('❌ Status query test failed');
  }
}

// Test transaction history
async function testTransactionHistory() {
  console.log('\n📜 Testing Transaction History...');
  
  if (TEST_CONFIG.apiKey === 'your_api_key_here') {
    console.log('⚠️  Please update TEST_CONFIG with your real PesaWise credentials');
    return;
  }

  const result = await makeRequest('/api/v1/transactions?page=1&per_page=10', 'GET');
  
  if (result.success) {
    console.log('✅ Transaction history retrieved successfully');
    console.log('📊 Transaction Count:', result.data.data?.transactions?.length || 0);
  } else {
    console.log('❌ Transaction history test failed');
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting PesaWise Endpoint Tests');
  console.log('🌐 Base URL:', TEST_CONFIG.baseUrl);
  
  if (TEST_CONFIG.apiKey === 'your_api_key_here') {
    console.log('\n⚠️  SETUP REQUIRED:');
    console.log('1. Get your PesaWise API credentials');
    console.log('2. Update TEST_CONFIG in this script');
    console.log('3. Run the script again');
    return;
  }

  // Test 1: Account Balance
  const balanceOk = await testAccountBalance();
  
  if (!balanceOk) {
    console.log('\n❌ Basic connectivity failed. Check your credentials.');
    return;
  }

  // Test 2: STK Push
  const checkoutRequestId = await testSTKPush();
  
  // Test 3: Status Query
  await testStatusQuery(checkoutRequestId);
  
  // Test 4: Transaction History
  await testTransactionHistory();
  
  console.log('\n✅ PesaWise endpoint tests completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Verify webhook URLs in PesaWise dashboard');
  console.log('2. Test with real phone number');
  console.log('3. Monitor webhook callbacks');
}

// Export for use in other scripts
module.exports = {
  testAccountBalance,
  testSTKPush,
  testStatusQuery,
  testTransactionHistory,
  runAllTests
};

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}