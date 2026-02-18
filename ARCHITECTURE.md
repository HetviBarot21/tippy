# System Architecture

## Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CUSTOMER                                 │
│                                                                  │
│  Scans QR Code → Opens Tip Page → Selects Payment Method       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR NEXT.JS APP                              │
│                  (http://localhost:3000)                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Frontend (app/test-payment/page.tsx)                    │  │
│  │  - Payment form                                           │  │
│  │  - Method selection (M-Pesa/Card)                        │  │
│  │  - Status polling                                         │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Routes (app/api/payments/)                          │  │
│  │  - POST /api/payments/initiate                           │  │
│  │  - GET  /api/payments/status                             │  │
│  │  - GET  /api/payments/transactions                       │  │
│  │  - GET  /api/payments/balance                            │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Payment Service (utils/pesawise/service.ts)             │  │
│  │  - initiateTipPayment()                                  │  │
│  │  - checkTipPaymentStatus()                               │  │
│  │  - getWalletTransactions()                               │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Pesawise Client (utils/pesawise/client.ts)             │  │
│  │  - OAuth2 authentication                                 │  │
│  │  - initiateSTKPush()                                     │  │
│  │  - createPaymentLink()                                   │  │
│  │  - queryTransactionStatus()                              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   PESAWISE API      │         │  LOCAL SUPABASE     │
│ (api.pesawise.xyz)  │         │  (localhost:54321)  │
│                     │         │                     │
│ - STK Push          │         │ - restaurants       │
│ - Payment Links     │         │ - waiters           │
│ - Transactions      │         │ - tips              │
│ - Balance           │         │ - payouts           │
└──────────┬──────────┘         └─────────────────────┘
           │
           │ Webhook Callback
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Webhook Handler (app/api/webhooks/pesawise/route.ts)          │
│  - Receives payment status updates                              │
│  - Updates tip records in database                              │
│  - Sends notifications (future)                                 │
└─────────────────────────────────────────────────────────────────┘
```

## M-Pesa Payment Flow

```
1. Customer enters phone & amount
   ↓
2. Frontend calls /api/payments/initiate
   ↓
3. Service creates tip record (status: pending)
   ↓
4. Pesawise Client sends STK Push
   ↓
5. Customer receives M-Pesa prompt on phone
   ↓
6. Customer enters PIN
   ↓
7. Pesawise sends webhook to /api/webhooks/pesawise
   ↓
8. Webhook updates tip (status: completed)
   ↓
9. Frontend polls /api/payments/status
   ↓
10. Shows success message
```

## Card Payment Flow

```
1. Customer enters amount
   ↓
2. Frontend calls /api/payments/initiate
   ↓
3. Service creates tip record (status: pending)
   ↓
4. Pesawise Client creates payment link
   ↓
5. Customer redirected to Pesawise payment page
   ↓
6. Customer enters card details
   ↓
7. Pesawise processes payment
   ↓
8. Pesawise sends webhook to /api/webhooks/pesawise
   ↓
9. Webhook updates tip (status: completed)
   ↓
10. Customer redirected to success page
```

## Database Schema

```
restaurants
├── id (UUID)
├── name
├── slug
├── email
├── commission_rate
└── is_active

waiters
├── id (UUID)
├── restaurant_id → restaurants(id)
├── name
├── phone_number
└── is_active

tips
├── id (UUID)
├── restaurant_id → restaurants(id)
├── waiter_id → waiters(id)
├── amount
├── commission_amount
├── net_amount
├── tip_type (waiter/restaurant)
├── payment_method (mpesa/card)
├── payment_status (pending/processing/completed/failed)
├── transaction_id
└── customer_phone

distribution_groups
├── id (UUID)
├── restaurant_id → restaurants(id)
├── group_name
└── percentage

payouts
├── id (UUID)
├── restaurant_id → restaurants(id)
├── waiter_id → waiters(id)
├── payout_type (waiter/group)
├── amount
├── status
└── payout_month
```

## File Structure

```
project/
│
├── app/
│   ├── test-payment/
│   │   └── page.tsx                    # Test UI
│   │
│   ├── api/
│   │   ├── payments/
│   │   │   ├── initiate/route.ts       # Start payment
│   │   │   ├── status/route.ts         # Check status
│   │   │   ├── transactions/route.ts   # Get history
│   │   │   └── balance/route.ts        # Get balance
│   │   │
│   │   └── webhooks/
│   │       └── pesawise/route.ts       # Payment callbacks
│   │
│   ├── page.tsx                        # Home page
│   └── layout.tsx                      # Root layout
│
├── utils/
│   ├── pesawise/
│   │   ├── client.ts                   # Pesawise API client
│   │   ├── service.ts                  # Business logic
│   │   └── README.md                   # Documentation
│   │
│   └── supabase/
│       ├── admin.ts                    # Admin client
│       └── server.ts                   # Server client
│
├── supabase/
│   ├── migrations/
│   │   ├── 20240202_multi_tenant_schema.sql
│   │   ├── 20240203_mpesa_integration.sql
│   │   └── 20240203_notifications.sql
│   │
│   └── seed.sql                        # Seed data
│
├── .env.local                          # Environment config
├── package.json                        # Dependencies
│
└── Documentation/
    ├── START_HERE.md                   # Quick start
    ├── SETUP_GUIDE.md                  # Detailed setup
    ├── PAYMENT_METHODS.md              # API docs
    ├── PESAWISE_INTEGRATION.md         # Integration guide
    └── ARCHITECTURE.md                 # This file
```

## Technology Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling (optional)

### Backend
- **Next.js API Routes** - Serverless functions
- **Supabase** - PostgreSQL database
- **Pesawise API** - Payment processing

### Development
- **Docker** - Local Supabase
- **Vitest** - Testing
- **ESLint** - Code quality

## Environment Variables

```env
# Next.js
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (Local)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Pesawise (Test)
PESAWISE_API_KEY=app_6vQ50aNKkB
PESAWISE_API_SECRET=udWnRUgd4k
PESAWISE_BASE_URL=https://api.pesawise.xyz
PESAWISE_BALANCE_ID=1102801
PESAWISE_CALLBACK_URL=http://localhost:3000/api/webhooks/pesawise
PESAWISE_REDIRECT_URL=http://localhost:3000/payment/success
```

## Security Features

1. **Row Level Security (RLS)** - Database access control
2. **OAuth2 Authentication** - Pesawise API security
3. **Environment Variables** - Sensitive data protection
4. **Webhook Validation** - Callback verification
5. **HTTPS Only** - Secure communication (production)

## Scalability

- **Serverless Functions** - Auto-scaling API routes
- **Database Indexes** - Fast queries
- **Connection Pooling** - Efficient database connections
- **Caching** - OAuth token caching
- **Async Processing** - Non-blocking operations

## Monitoring

- **Supabase Studio** - Database monitoring
- **Console Logs** - Application logs
- **Error Tracking** - Error handling
- **Transaction History** - Payment audit trail

## Future Enhancements

- [ ] SMS notifications
- [ ] Email receipts
- [ ] Analytics dashboard
- [ ] Bulk payouts
- [ ] Multi-currency support
- [ ] Mobile app
- [ ] Admin panel
- [ ] Reporting system
