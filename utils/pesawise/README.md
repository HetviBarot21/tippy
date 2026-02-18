# Pesawise Payment Integration

Complete M-Pesa payment integration using Pesawise API for the QR Tipping System.

## Overview

Pesawise handles all M-Pesa payments via STK Push (Lipa Na M-Pesa Online). When a customer scans a QR code and initiates a tip, the system:

1. Creates a tip record in the database
2. Sends an STK Push to the customer's phone
3. Customer enters M-Pesa PIN to complete payment
4. Pesawise sends a webhook callback with payment status
5. System updates the tip record and notifies the waiter/restaurant

## Configuration

### Environment Variables

```env
PESAWISE_API_KEY=app_6vQ50aNKkB
PESAWISE_API_SECRET=udWnRUgd4k
PESAWISE_BASE_URL=https://api.pesawise.xyz
PESAWISE_BALANCE_ID=1102801
PESAWISE_CALLBACK_URL=http://localhost:3000/api/webhooks/pesawise
```

### Test Environment

- Base URL: `https://api.pesawise.xyz`
- Test credentials are provided above
- No real money is charged in test mode

### Production Environment

- Base URL: `https://api.pesawise.com` (update when going live)
- Get production credentials from Pesawise dashboard
- Update callback URL to your production domain

## API Endpoints

### 1. Initiate Payment

```
POST /api/payments/initiate
```

**Request Body:**
```json
{
  "restaurantId": "uuid",
  "waiterId": "uuid",  // optional, null for restaurant tips
  "amount": 100,
  "phoneNumber": "254712345678",
  "tipType": "waiter",  // or "restaurant"
  "tableId": "uuid"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "tipId": "uuid",
  "checkoutRequestId": "ws_CO_123456789",
  "message": "STK Push sent successfully. Please check your phone."
}
```

### 2. Check Payment Status

```
GET /api/payments/status?tipId=uuid
```

**Response:**
```json
{
  "success": true,
  "status": "completed",  // or "pending", "processing", "failed"
  "message": "Payment completed"
}
```

### 3. Get Wallet Transactions

```
GET /api/payments/transactions?startDate=2024-01-01&endDate=2024-01-31&page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "txn_123",
      "amount": 100,
      "phoneNumber": "254712345678",
      "reference": "TIP-uuid",
      "status": "completed",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

### 4. Get Wallet Balance

```
GET /api/payments/balance
```

**Response:**
```json
{
  "success": true,
  "balance": 50000.00,
  "currency": "KES"
}
```

### 5. Webhook Callback

```
POST /api/webhooks/pesawise
```

Pesawise sends payment status updates to this endpoint. The webhook handler automatically updates tip records in the database.

## Usage Examples

### Frontend: Initiate Payment

```typescript
async function payTip(amount: number, phoneNumber: string, waiterId: string) {
  const response = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: 'restaurant-uuid',
      waiterId: waiterId,
      amount: amount,
      phoneNumber: phoneNumber,
      tipType: 'waiter',
    }),
  });

  const data = await response.json();
  
  if (data.success) {
    // Show success message
    alert('Please check your phone to complete payment');
    
    // Poll for payment status
    checkPaymentStatus(data.tipId);
  } else {
    alert('Payment failed: ' + data.error);
  }
}
```

### Frontend: Check Payment Status

```typescript
async function checkPaymentStatus(tipId: string) {
  const maxAttempts = 30; // 30 seconds
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;

    const response = await fetch(`/api/payments/status?tipId=${tipId}`);
    const data = await response.json();

    if (data.status === 'completed') {
      clearInterval(interval);
      alert('Payment successful! Thank you.');
    } else if (data.status === 'failed') {
      clearInterval(interval);
      alert('Payment failed. Please try again.');
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      alert('Payment is taking longer than expected. Please check back later.');
    }
  }, 1000); // Check every second
}
```

### Backend: Service Usage

```typescript
import { initiateTipPayment, checkTipPaymentStatus } from '@/utils/pesawise/service';

// Initiate payment
const result = await initiateTipPayment({
  restaurantId: 'uuid',
  waiterId: 'uuid',
  amount: 100,
  phoneNumber: '254712345678',
  tipType: 'waiter',
});

// Check status
const status = await checkTipPaymentStatus('tip-uuid');
```

## Payment Flow

1. **Customer scans QR code** → Lands on tip page
2. **Customer enters amount and phone** → Clicks "Pay with M-Pesa"
3. **System calls `/api/payments/initiate`** → Creates tip record
4. **Pesawise sends STK Push** → Customer's phone shows M-Pesa prompt
5. **Customer enters PIN** → M-Pesa processes payment
6. **Pesawise sends webhook** → System updates tip status
7. **Frontend polls status** → Shows success/failure message

## Database Schema

Tips are stored in the `tips` table with these key fields:

```sql
- id: UUID
- restaurant_id: UUID
- waiter_id: UUID (nullable)
- amount: DECIMAL
- commission_amount: DECIMAL
- net_amount: DECIMAL
- tip_type: ENUM('waiter', 'restaurant')
- payment_method: ENUM('mpesa', 'card', 'cash')
- payment_status: ENUM('pending', 'processing', 'completed', 'failed')
- transaction_id: VARCHAR (Pesawise transaction ID)
- customer_phone: VARCHAR
```

## Error Handling

### Common Errors

1. **Invalid phone number**
   - Ensure format: 254XXXXXXXXX
   - System auto-formats 07XX to 2547XX

2. **Insufficient balance**
   - Customer doesn't have enough M-Pesa balance
   - Payment fails, tip marked as 'failed'

3. **Customer cancels**
   - Customer dismisses STK prompt
   - Payment fails after timeout

4. **Network issues**
   - Retry mechanism in place
   - Status can be checked later

### Handling Failed Payments

```typescript
// Tips with failed status can be retried
const { data: failedTips } = await supabase
  .from('tips')
  .select('*')
  .eq('payment_status', 'failed')
  .gte('created_at', yesterday);

// Allow customer to retry payment
```

## Testing

### Test Phone Numbers

Use any Kenyan phone number in test mode. The STK push will be simulated.

### Test Scenarios

1. **Successful payment**: Normal flow
2. **Failed payment**: Cancel STK prompt
3. **Timeout**: Don't respond to STK prompt
4. **Invalid phone**: Use wrong format

### Test Commands

```bash
# Test STK Push
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "test-restaurant-id",
    "amount": 100,
    "phoneNumber": "254712345678",
    "tipType": "waiter"
  }'

# Check status
curl http://localhost:3000/api/payments/status?tipId=xxx

# Get transactions
curl http://localhost:3000/api/payments/transactions

# Get balance
curl http://localhost:3000/api/payments/balance
```

## Security

- API credentials stored in environment variables
- OAuth2 tokens cached and auto-refreshed
- All API calls use HTTPS
- Webhook endpoint validates request source
- Phone numbers sanitized before processing

## Monitoring

### Dashboard Metrics

- Total transactions
- Success rate
- Average transaction amount
- Failed payment reasons
- Daily/weekly/monthly trends

### Logs

All payment operations are logged:
- Payment initiations
- Status updates
- Webhook callbacks
- Errors and failures

## Support

For issues with Pesawise integration:
- Email: support@mail.pesawise.com
- Documentation: https://docs.pesawise.com
- Test environment issues: Check API credentials

## Migration from M-Pesa Daraja

If migrating from the old M-Pesa Daraja integration:

1. Update environment variables
2. Replace API route imports
3. Update frontend payment forms
4. Test thoroughly in sandbox
5. Update webhook URLs
6. Deploy and monitor

The new Pesawise integration is simpler and more reliable than direct Daraja integration.
