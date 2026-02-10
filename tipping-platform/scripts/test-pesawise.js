/**
 * PesaWise API Test Script
 * Simple script to test PesaWise integration
 */

const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testPhone: '254700000000', // Use a test phone number
  testAmount: 10 // Test with 10 KES
};

async function testPesaWiseConnection() {
  console.log('🔍 Testing PesaWise API connection...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/pesawise/test`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ PesaWise connection successful');
      console.log('📊 Account Balance:', data.data?.balance);
    } else {
      console.log('❌ PesaWise connection failed:', data.error);
    }
    
    return data.success;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function testSTKPush() {
  console.log('📱 Testing STK Push...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/pesawise/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'stk-push',
        phone: TEST_CONFIG.testPhone,
        amount: TEST_CONFIG.testAmount
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.data) {
      console.log('✅ STK Push initiated successfully');
      console.log('📋 Checkout Request ID:', data.data.checkout_request_id);
      console.log('💬 Customer Message:', data.data.customer_message);
      
      return data.data.checkout_request_id;
    } else {
      console.log('❌ STK Push failed:', data.error || data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ STK Push test failed:', error.message);
    return null;
  }
}

async function testStatusQuery(checkoutRequestId) {
  if (!checkoutRequestId) {
    console.log('⏭️  Skipping status query (no checkout request ID)');
    return;
  }
  
  console.log('🔍 Testing payment status query...');
  
  try {
    // Wait a bit before querying status
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/pesawise/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'status-query',
        checkoutRequestId: checkoutRequestId
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.data) {
      console.log('✅ Status query successful');
      console.log('📊 Result Code:', data.data.result_code);
      console.log('📝 Result Description:', data.data.result_desc);
      
      if (data.data.mpesa_receipt_number) {
        console.log('🧾 M-Pesa Receipt:', data.data.mpesa_receipt_number);
      }
    } else {
      console.log('❌ Status query failed:', data.error || data.message);
    }
  } catch (error) {
    console.error('❌ Status query test failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting PesaWise API Tests\n');
  
  // Test 1: Connection
  const connectionOk = await testPesaWiseConnection();
  console.log('');
  
  if (!connectionOk) {
    console.log('❌ Connection failed. Please check your PesaWise configuration.');
    return;
  }
  
  // Test 2: STK Push
  const checkoutRequestId = await testSTKPush();
  console.log('');
  
  // Test 3: Status Query
  await testStatusQuery(checkoutRequestId);
  console.log('');
  
  console.log('✅ PesaWise tests completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Update your .env.local with real PesaWise credentials');
  console.log('2. Test with a real phone number');
  console.log('3. Set up webhook URLs for production');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPesaWiseConnection,
  testSTKPush,
  testStatusQuery,
  runTests
};