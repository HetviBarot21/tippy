# M-Pesa Integration Testing Guide

This guide will help you test the M-Pesa integration step by step.

## Prerequisites

1. **Node.js and npm** installed
2. **Supabase CLI** installed
3. **M-Pesa Sandbox Account** (for real testing)

## Step 1: Environment Setup

### 1.1 Start Supabase Local Development

```bash
# Start Supabase local instance
npm run supabase:start

# Check status
npm run supabase:status
```

This will give you local database URLs and keys.

### 1.2 Set up Environment Variables

Create a `.env.local` file with:

```env
# Supabase (from supabase:status command)
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# M-Pesa Sandbox Configuration
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=http://localhost:3000/api/webhooks/mpesa
MPESA_TIMEOUT_URL=http://localhost:3000/api/webhooks/mpesa/timeout

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 1.3 Run Database Migrations

```bash
# Reset database and apply all migrations
npm run supabase:reset
```

## Step 2: Set Up Test Data

### 2.1 Install tsx for running TypeScript scripts

```bash
npm install -g tsx
```

### 2.2 Run the test data setup script

```bash
npx tsx scripts/setup-test-data.ts
```

This will create:
- A test restaurant
- Test waiters
- Test QR codes
- Distribution groups
- A sample tip

## Step 3: Start the Development Server

```bash
npm run dev
```

Your app will be available at `http://localhost:3000`

## Step 4: Testing Methods

### Method 1: Web Interface Testing

1. Go to `http://localhost:3000/test-mpesa`
2. Click the test buttons to see API responses
3. Check the results in real-time

### Method 2: API Testing with curl

#### Test Tip Creation
```bash
curl -X POST http://localhost:3000/api/tips \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": "YOUR_RESTAURANT_ID",
    "amount": 100,
    "tip_type": "restaurant",
    "payment_method": "mpesa",
    "customer_phone": "+254712345678"
  }'
```

#### Test M-Pesa Payment Initiation
```bash
curl -X POST http://localhost:3000/api/payments/mpesa/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "tip_id": "YOUR_TIP_ID",
    "phone_number": "+254712345678",
    "amount": 100
  }'
```

#### Test Webhook Status
```bash
curl http://localhost:3000/api/webhooks/mpesa
```

### Method 3: Database Inspection

Use Supabase Studio (usually at `http://localhost:54323`) to:
- View created tips
- Check M-Pesa requests
- Monitor callback data
- Inspect notifications

### Method 4: Run Unit Tests

```bash
# Run all M-Pesa tests
npm test -- test/mpesa

# Run specific test file
npm test -- test/mpesa/client.test.ts

# Run tests in watch mode
npm run test:watch -- test/mpesa
```

## Step 5: Testing Scenarios

### Scenario 1: Successful Payment Flow

1. Create a tip via API
2. Initiate M-Pesa payment
3. Simulate successful callback
4. Check tip status updated to 'completed'
5. Verify notification sent

### Scenario 2: Failed Payment

1. Create a tip
2. Initiate payment
3. Simulate failed callback (ResultCode: 1032)
4. Check tip status updated to 'failed'

### Scenario 3: Payment Timeout

1. Create a tip
2. Initiate payment
3. Simulate timeout webhook
4. Check tip status updated to 'cancelled'

## Step 6: Monitoring and Debugging

### Check Logs

```bash
# In your terminal running npm run dev, you'll see:
# - API request logs
# - M-Pesa client logs
# - Database operation logs
# - Error messages
```

### Database Queries

```sql
-- Check tips
SELECT * FROM tips ORDER BY created_at DESC;

-- Check M-Pesa requests
SELECT * FROM mpesa_requests ORDER BY created_at DESC;

-- Check callbacks
SELECT * FROM mpesa_callbacks ORDER BY created_at DESC;

-- Check notifications
SELECT * FROM notifications ORDER BY created_at DESC;
```

## Step 7: Real M-Pesa Testing (Optional)

To test with real M-Pesa sandbox:

1. **Get M-Pesa Sandbox Credentials**:
   - Go to https://developer.safaricom.co.ke/
   - Create an app
   - Get Consumer Key and Consumer Secret
   - Get test credentials

2. **Update Environment Variables**:
   ```env
   MPESA_CONSUMER_KEY=your-real-consumer-key
   MPESA_CONSUMER_SECRET=your-real-consumer-secret
   MPESA_BUSINESS_SHORT_CODE=your-shortcode
   MPESA_PASSKEY=your-real-passkey
   ```

3. **Test with Real Phone Numbers**:
   - Use Safaricom test numbers
   - Check your phone for STK Push prompts

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Make sure Supabase is running: `npm run supabase:status`
   - Check environment variables

2. **M-Pesa Authentication Error**:
   - Verify consumer key and secret
   - Check if credentials are for sandbox/production

3. **Webhook Not Receiving Callbacks**:
   - Use ngrok for external webhooks: `ngrok http 3000`
   - Update callback URL in M-Pesa dashboard

4. **Phone Number Format Error**:
   - Use format: +254XXXXXXXXX
   - Ensure it's a valid Kenyan mobile number

### Debug Commands

```bash
# Check Supabase logs
npm run supabase:logs

# Reset database if needed
npm run supabase:reset

# Generate fresh types
npm run supabase:generate-types
```

## Expected Results

When everything is working correctly, you should see:

1. ✅ Tips created successfully
2. ✅ M-Pesa STK Push initiated
3. ✅ Webhooks receiving callbacks
4. ✅ Database updated with transaction status
5. ✅ Notifications logged
6. ✅ Commission calculations correct

## Next Steps

Once basic testing works:

1. Test with real M-Pesa sandbox
2. Implement frontend tipping interface
3. Add error handling UI
4. Set up production environment
5. Configure real webhook URLs

## Support

If you encounter issues:

1. Check the console logs
2. Inspect database tables
3. Verify environment variables
4. Test individual API endpoints
5. Review the test files for examples