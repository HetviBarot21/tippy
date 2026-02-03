// Simple M-Pesa test script
require('dotenv').config({ path: '.env.local' });

async function testMPesaAuth() {
  try {
    console.log('Testing M-Pesa OAuth...');
    
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret) {
      throw new Error('Missing M-Pesa credentials');
    }
    
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const oauthUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
    console.log('Making OAuth request to:', oauthUrl);
    
    const response = await fetch(oauthUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('OAuth Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OAuth Error Response:', errorText);
      throw new Error(`OAuth failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('OAuth Success:', data);
    
    // Now test STK Push
    console.log('\nTesting STK Push...');
    
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    const passkey = process.env.MPESA_PASSKEY;
    const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');
    
    const stkPushData = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 100,
      PartyA: '254708374149',
      PartyB: businessShortCode,
      PhoneNumber: '254708374149',
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: 'TEST-TIP',
      TransactionDesc: 'Test tip payment'
    };
    
    console.log('STK Push Data:', JSON.stringify(stkPushData, null, 2));
    
    const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPushData)
    });
    
    console.log('STK Push Response Status:', stkResponse.status);
    
    const stkResult = await stkResponse.json();
    console.log('STK Push Result:', JSON.stringify(stkResult, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMPesaAuth();