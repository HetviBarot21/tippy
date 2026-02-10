# PesaWise Integration Guide

This guide explains how to integrate PesaWise as your M-Pesa payment provider for the tipping platform.

## 🔑 Getting PesaWise API Keys

### Step 1: Account Registration & KYC
To use PesaWise, you need to complete their onboarding process:

1. **Visit PesaWise Website**: Go to [https://pesawise.com/](https://pesawise.com/)
2. **Sign Up**: Create a business account
3. **Submit KYC Documents**: You'll need to provide:
   - **Business Registration Certificate** (Certificate of Incorporation)
   - **KRA PIN Certificate** 
   - **Business Permit/License**
   - **Director's ID Copies**
   - **Bank Statement** (last 3 months)
   - **Proof of Business Address**

### Step 2: API Access Request
After KYC approval:

1. **Contact PesaWise Support**: Email `support@pesawise.com` or use their contact form
2. **Request API Access**: Mention you need:
   - API Key
   - Secret Key  
   - Sandbox access for testing
   - Production access (after testing)
3. **Provide Integration Details**:
   - Your business use case (tipping platform)
   - Expected transaction volume
   - Technical contact information

### Step 3: Receive Credentials
PesaWise will provide you with:

- ✅ **API Key** - Your unique API authentication key
- ✅ **Secret Key** - Your secret key for request signing  
- ✅ **Business Short Code** - Your M-Pesa business number (from Safaricom)
- ✅ **Sandbox Environment Access** - For testing
- ✅ **Documentation Access** - API documentation and integration guides

### Step 4: M-Pesa Business Account
You also need a **Safaricom M-Pesa Business Account**:

1. **Apply with Safaricom**: Visit a Safaricom shop or apply online
2. **Get Till Number/Paybill**: This becomes your business short code
3. **Link to PesaWise**: PesaWise will help link your M-Pesa account to their platform

## ⏱️ Timeline Expectations

- **KYC Review**: 3-5 business days
- **API Access Approval**: 1-2 business days after KYC
- **M-Pesa Business Account**: 5-10 business days (if you don't have one)
- **Total Setup Time**: 1-2 weeks

## 💰 Costs & Fees

### PesaWise Fees
- **Setup Fee**: Contact PesaWise for current pricing
- **Transaction Fees**: Typically lower than direct Daraja API costs
- **Monthly Fees**: May apply based on volume

### M-Pesa Business Account Fees
- **Account Opening**: ~KES 2,000-5,000
- **Transaction Fees**: Standard M-Pesa business rates
- **Monthly Maintenance**: ~KES 50-100

## 🚀 Quick Start (While Waiting for Approval)

You can start development immediately using the existing M-Pesa Daraja integration:

### 1. Use Current Daraja Setup
```bash
# Keep using Daraja for now
MPESA_PROVIDER=daraja
# Your existing Daraja credentials work
```

### 2. Prepare for PesaWise
The integration is already built and ready. Once you get PesaWise credentials:

```bash
# Switch to PesaWise
MPESA_PROVIDER=pesawise
PESAWISE_API_KEY=your_api_key_from_pesawise
PESAWISE_SECRET_KEY=your_secret_key_from_pesawise
PESAWISE_BUSINESS_SHORT_CODE=your_mpesa_till_number
PESAWISE_ENVIRONMENT=sandbox
```

### 3. Test Integration
```bash
node scripts/test-pesawise.js
```

## ⚙️ Configuration

### 1. Environment Variables

Add these variables to your `.env.local` file:

```bash
# PesaWise API Configuration
MPESA_PROVIDER=pesawise
PESAWISE_API_KEY=your_pesawise_api_key_here
PESAWISE_SECRET_KEY=your_pesawise_secret_key_here
PESAWISE_BUSINESS_SHORT_CODE=your_business_short_code_here
PESAWISE_ENVIRONMENT=sandbox
```

### 2. API Endpoints

PesaWise uses these base URLs:
- **Sandbox**: `https://sandbox.pesawise.com`
- **Production**: `https://api.pesawise.com`

### 3. Webhook URLs

Configure these webhook URLs in your PesaWise dashboard:

- **Callback URL**: `https://yourdomain.com/api/webhooks/pesawise/callback`
- **Timeout URL**: `https://yourdomain.com/api/webhooks/pesawise/timeout`

For local development:
- **Callback URL**: `http://localhost:3000/api/webhooks/pesawise/callback`
- **Timeout URL**: `http://localhost:3000/api/webhooks/pesawise/timeout`

## 🚀 Getting Started

### 2. Test the Integration

Run the test script to verify your configuration:

```bash
cd tipping-platform
node scripts/test-pesawise.js
```

Or test via the API endpoint:

```bash
# Test connection
curl http://localhost:3000/api/pesawise/test

# Test STK Push
curl -X POST http://localhost:3000/api/pesawise/test \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stk-push",
    "phone": "254700000000",
    "amount": 10
  }'
```

### 3. Run Integration Tests

```bash
npm test tests/pesawise-integration.test.js
```

## 📞 Contact Information

### PesaWise Support
- **Email**: support@pesawise.com
- **Website**: https://pesawise.com/
- **Phone**: Check their website for current contact numbers

### What to Ask PesaWise
When contacting them, mention:

1. **Business Type**: "Digital tipping platform for restaurants"
2. **Integration Need**: "REST API integration for STK Push payments"
3. **Volume Estimate**: Your expected monthly transaction volume
4. **Technical Requirements**: 
   - Webhook support for payment confirmations
   - Real-time payment status queries
   - Sandbox environment for testing

## 🔄 Alternative: Continue with Daraja

If PesaWise approval takes too long, you can continue using the existing M-Pesa Daraja API:

### Advantages of Current Daraja Setup:
- ✅ **Already Working** - No waiting for approval
- ✅ **Direct M-Pesa Integration** - No third-party dependency
- ✅ **Well Tested** - Proven integration in your codebase

### When to Switch to PesaWise:
- 🔄 **Better Developer Experience** - Simpler API
- 🔄 **Lower Transaction Fees** - Potentially cheaper
- 🔄 **Better Support** - Dedicated API support team
- 🔄 **Additional Features** - Enhanced reporting and analytics

## 📋 Required Documents Checklist

Before contacting PesaWise, prepare these documents:

### Business Documents
- [ ] Certificate of Incorporation
- [ ] KRA PIN Certificate
- [ ] Business Permit/License
- [ ] VAT Certificate (if applicable)

### Financial Documents  
- [ ] Bank Statements (last 3 months)
- [ ] Audited Financial Statements (if available)
- [ ] Business Plan/Pitch Deck

### Identity Documents
- [ ] Director's National ID copies
- [ ] Passport photos of directors
- [ ] Proof of business address

### Technical Documents
- [ ] System architecture overview
- [ ] Integration timeline
- [ ] Expected transaction volumes
- [ ] Security compliance measures

## 🎯 Recommendation

**For Immediate Development**: Continue with your existing M-Pesa Daraja integration while applying for PesaWise.

**For Production**: Consider PesaWise for better developer experience and potentially lower costs, but Daraja is perfectly fine for production use.

The beauty of the current implementation is that you can switch between providers seamlessly without changing your application code!

### 2. Test the Integration

Run the test script to verify your configuration:

```bash
cd tipping-platform
node scripts/test-pesawise.js
```

Or test via the API endpoint:

```bash
# Test connection
curl http://localhost:3000/api/pesawise/test

# Test STK Push
curl -X POST http://localhost:3000/api/pesawise/test \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stk-push",
    "phone": "254700000000",
    "amount": 10
  }'
```

### 3. Run Integration Tests

```bash
npm test tests/pesawise-integration.test.js
```

## 📋 API Endpoints

### STK Push Initiation

The payment service automatically uses PesaWise when configured. The flow is:

1. Customer initiates payment
2. System calls `pesaWiseService.initiateSTKPush()`
3. PesaWise sends STK Push to customer's phone
4. Customer enters M-Pesa PIN
5. PesaWise sends callback to your webhook

### Payment Status Query

Query payment status programmatically:

```javascript
import { pesaWiseService } from '@/utils/pesawise/service';

const status = await pesaWiseService.querySTKPushStatus(checkoutRequestId);
```

### Account Balance

Check your PesaWise account balance:

```javascript
const balance = await pesaWiseService.getAccountBalance();
```

## 🔄 Webhook Handling

### Callback Webhook

Receives payment confirmations at `/api/webhooks/pesawise/callback`:

```json
{
  "checkout_request_id": "ws_CO_123456789",
  "merchant_request_id": "29115-34620561-1",
  "result_code": "0",
  "result_desc": "The service request is processed successfully.",
  "amount": 100,
  "mpesa_receipt_number": "NLJ7RT61SV",
  "transaction_date": "2024-02-03T10:30:00Z",
  "phone_number": "254708374149"
}
```

### Timeout Webhook

Receives timeout notifications at `/api/webhooks/pesawise/timeout`:

```json
{
  "checkout_request_id": "ws_CO_123456789",
  "merchant_request_id": "29115-34620561-1"
}
```

## 🔒 Security

### Signature Validation

All webhooks are validated using HMAC-SHA256 signatures:

```javascript
const isValid = pesaWiseService.validateCallbackSignature(
  payload,
  signature,
  timestamp
);
```

### Phone Number Normalization

Phone numbers are automatically normalized to the format `254XXXXXXXXX`:

```javascript
// Input: "0708374149" or "+254708374149"
// Output: "254708374149"
const normalized = pesaWiseService.normalizePhoneNumber(phone);
```

## 🔄 Fallback to Daraja

The system supports automatic fallback to M-Pesa Daraja API if PesaWise fails:

1. Try PesaWise first (if configured)
2. If PesaWise fails, fallback to Daraja API
3. This ensures payment reliability

To disable fallback and use only PesaWise:

```bash
MPESA_PROVIDER=pesawise
# Don't set MPESA_CONSUMER_KEY and other Daraja variables
```

## 📊 Monitoring

### Transaction Status Codes

- `0` - Success (completed)
- `1` - Failed
- `1032` - Cancelled by user
- `1037` - Timeout
- `1001` - Insufficient funds
- `2001` - Invalid phone number

### Logging

All PesaWise interactions are logged with appropriate detail levels:

```javascript
console.log('PesaWise API Request:', { method, url, data });
console.log('PesaWise API Response:', responseData);
```

## 🧪 Testing

### Test Phone Numbers

Use these test phone numbers in sandbox mode:

- `254700000000` - Success scenario
- `254700000001` - Failed scenario  
- `254700000002` - Timeout scenario
- `254700000003` - Cancelled scenario

### Test Amounts

- `1-999` - Success
- `1000-1999` - Failed
- `2000-2999` - Timeout
- `3000-3999` - Cancelled

## 🚨 Troubleshooting

### Common Issues

1. **Invalid Signature Error**
   - Check your `PESAWISE_SECRET_KEY`
   - Ensure webhook URLs are correctly configured

2. **Connection Failed**
   - Verify `PESAWISE_API_KEY` is correct
   - Check if you're using the right environment (sandbox/production)

3. **STK Push Failed**
   - Verify phone number format
   - Check account balance
   - Ensure business short code is correct

### Debug Mode

Enable debug logging:

```bash
DEBUG=pesawise:* npm run dev
```

### Support

- PesaWise Documentation: https://docs.pesawise.com/
- PesaWise Support: support@pesawise.com
- Integration Issues: Check the logs in `/api/pesawise/test`

## 🔄 Migration from Daraja

If migrating from M-Pesa Daraja API:

1. Keep existing Daraja configuration as fallback
2. Add PesaWise configuration
3. Set `MPESA_PROVIDER=pesawise`
4. Test thoroughly in sandbox
5. Update webhook URLs in production
6. Monitor both systems during transition

The system will automatically handle the migration seamlessly.