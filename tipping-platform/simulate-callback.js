// Simulate M-Pesa callback for testing
require('dotenv').config({ path: '.env.local' });

async function simulateCallback(checkoutRequestId) {
  const callbackData = {
    Body: {
      stkCallback: {
        MerchantRequestID: 'test-merchant-123',
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 100 },
            { Name: 'MpesaReceiptNumber', Value: 'TEST123456' },
            { Name: 'TransactionDate', Value: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14) },
            { Name: 'PhoneNumber', Value: '254708374149' }
          ]
        }
      }
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/webhooks/mpesa/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData)
    });

    const result = await response.json();
    console.log('Callback simulation result:', result);
  } catch (error) {
    console.error('Callback simulation failed:', error);
  }
}

// Usage: node simulate-callback.js <CheckoutRequestID>
const checkoutRequestId = process.argv[2];
if (checkoutRequestId) {
  simulateCallback(checkoutRequestId);
} else {
  console.log('Usage: node simulate-callback.js <CheckoutRequestID>');
}