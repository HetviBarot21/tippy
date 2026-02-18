# Payment Methods - M-Pesa & Card via Pesawise

## Overview

The QR Tipping System supports two payment methods, both powered by Pesawise:

1. **M-Pesa (STK Push)** - Direct mobile money payment
2. **Card Payment** - Visa/Mastercard via payment link

## How It Works

### M-Pesa Payment Flow

1. Customer selects "Pay with M-Pesa"
2. Enters phone number and amount
3. System sends STK Push to their phone
4. Customer enters M-Pesa PIN
5. Payment confirmed instantly
6. Tip recorded in database

### Card Payment Flow

1. Customer selects "Pay with Card"
2. Enters amount
3. System generates payment link
4. Customer redirected to Pesawise payment page
5. Customer enters card details
6. Payment processed
7. Customer redirected back to success page
8. Tip recorded in database

## API Usage

### Initiate M-Pesa Payment

```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "uuid",
    "waiterId": "uuid",
    "amount": 100,
    "phoneNumber": "254712345678",
    "tipType": "waiter",
    "paymentMethod": "mpesa"
  }'
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

### Initiate Card Payment

```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "uuid",
    "waiterId": "uuid",
    "amount": 100,
    "tipType": "waiter",
    "paymentMethod": "card"
  }'
```

**Response:**
```json
{
  "success": true,
  "tipId": "uuid",
  "paymentLink": "https://pay.pesawise.xyz/link/abc123",
  "message": "Payment link created successfully. Redirecting to payment page."
}
```

## Frontend Integration

### Payment Selection Form

```typescript
'use client';

import { useState } from 'react';

export default function TipPaymentForm({ restaurantId, waiterId }) {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [loading, setLoading] = useState(false);

  async function handlePayment() {
    setLoading(true);

    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          waiterId,
          amount: parseFloat(amount),
          phoneNumber: paymentMethod === 'mpesa' ? phone : undefined,
          tipType: 'waiter',
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (paymentMethod === 'mpesa') {
          alert('Check your phone to complete payment');
          pollPaymentStatus(data.tipId);
        } else {
          // Redirect to payment link for card payment
          window.location.href = data.paymentLink;
        }
      } else {
        alert('Payment failed: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function pollPaymentStatus(tipId: string) {
    const maxAttempts = 30;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      const response = await fetch(`/api/payments/status?tipId=${tipId}`);
      const data = await response.json();

      if (data.status === 'completed') {
        clearInterval(interval);
        alert('Payment successful!');
        window.location.href = '/success';
      } else if (data.status === 'failed' || attempts >= maxAttempts) {
        clearInterval(interval);
        alert('Payment failed or timed out');
      }
    }, 1000);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
      <h2>Choose Payment Method</h2>
      
      <div>
        <label>
          <input
            type="radio"
            value="mpesa"
            checked={paymentMethod === 'mpesa'}
            onChange={(e) => setPaymentMethod('mpesa')}
          />
          M-Pesa
        </label>
        <label>
          <input
            type="radio"
            value="card"
            checked={paymentMethod === 'card'}
            onChange={(e) => setPaymentMethod('card')}
          />
          Card (Visa/Mastercard)
        </label>
      </div>

      <input
        type="number"
        placeholder="Amount (KES)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      {paymentMethod === 'mpesa' && (
        <input
          type="tel"
          placeholder="Phone (254...)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : `Pay with ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'}`}
      </button>
    </form>
  );
}
```

## Payment Link Features

Pesawise payment links support:
- **M-Pesa** - Direct mobile money
- **Card Payments** - Visa/Mastercard
- **Bank Transfer** - Direct bank transfer
- **Pesawise Transfer** - Wallet-to-wallet

When a customer clicks the payment link, they see all available options and can choose their preferred method.

## Callback Handling

Both payment methods use the same webhook endpoint:

```
POST /api/webhooks/pesawise
```

The webhook receives payment status updates and automatically updates the tip record in the database.

## Configuration

### Environment Variables

```env
# Pesawise Configuration
PESAWISE_API_KEY=app_6vQ50aNKkB
PESAWISE_API_SECRET=udWnRUgd4k
PESAWISE_BASE_URL=https://api.pesawise.xyz
PESAWISE_BALANCE_ID=1102801

# Callback URL - where Pesawise sends payment status updates
PESAWISE_CALLBACK_URL=http://localhost:3000/api/webhooks/pesawise

# Redirect URL - where customers return after card payment
PESAWISE_REDIRECT_URL=http://localhost:3000/payment/success
```

### Production Setup

When deploying to production:

1. Update `PESAWISE_BASE_URL` to `https://api.pesawise.com`
2. Update `PESAWISE_CALLBACK_URL` to your production domain
3. Update `PESAWISE_REDIRECT_URL` to your production success page
4. Get production API credentials from Pesawise dashboard

## Database Schema

The `tips` table supports both payment methods:

```sql
CREATE TABLE tips (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  waiter_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  tip_type ENUM('waiter', 'restaurant'),
  payment_method ENUM('mpesa', 'card'),  -- Payment method used
  payment_status ENUM('pending', 'processing', 'completed', 'failed'),
  transaction_id VARCHAR(255),  -- Pesawise transaction/link ID
  customer_phone VARCHAR(20),  -- For M-Pesa payments
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

### Test M-Pesa Payment

```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "test-id",
    "amount": 100,
    "phoneNumber": "254712345678",
    "tipType": "waiter",
    "paymentMethod": "mpesa"
  }'
```

### Test Card Payment

```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type": "application/json" \
  -d '{
    "restaurantId": "test-id",
    "amount": 100,
    "tipType": "waiter",
    "paymentMethod": "card"
  }'
```

The response will include a `paymentLink` that you can open in a browser to test the card payment flow.

## Advantages

### M-Pesa
- ✅ Instant payment confirmation
- ✅ No need to leave the app
- ✅ Familiar to Kenyan users
- ✅ No card details required

### Card Payment
- ✅ Accepts international cards
- ✅ No phone number required
- ✅ Supports Visa/Mastercard
- ✅ Professional payment page

## Transaction Fees

Pesawise charges transaction fees based on payment method:
- M-Pesa: ~1-2% of transaction
- Card: ~2-3% of transaction

Check with Pesawise for exact rates.

## Support

- **Pesawise Docs**: https://docs.pesawise.com
- **Support Email**: support@mail.pesawise.com
- **Payment Links Guide**: https://docs.pesawise.com/tutorial/how-tos/create-a-payment-link

## Summary

✅ M-Pesa STK Push for instant mobile payments
✅ Card payments via secure payment links
✅ Single API endpoint for both methods
✅ Automatic webhook handling
✅ Complete transaction tracking
✅ Test credentials configured

Both payment methods are ready to use!
