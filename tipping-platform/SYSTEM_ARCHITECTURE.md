# Tippy Platform - System Architecture

## Overview
Multi-tenant tipping platform with PesaWise payment integration for both inflow (tips) and outflow (payouts).

---

## Two Dashboard Types

### 1. Super Admin Dashboard (YourApps) - `/admin`
**Purpose**: Manage the entire platform, all restaurants, and process payouts

**Access**: YourApps team only (@yourapps.co.ke, @yourappsltd.com, admin@tippy.co.ke)

**Features**:
- **PesaWise Wallet Management**
  - View account balance, available balance, reserved balance
  - View all wallet transactions (tips in, payouts out)
  - Real-time refresh and pagination

- **Restaurant Management**
  - View all restaurants
  - Add/remove restaurants
  - Activate/deactivate restaurants
  - **Edit commission rate per restaurant** (editable percentage)
  - View restaurant dashboards

- **Payout Management** (`/admin/payouts`)
  - View pending payouts (all restaurants)
  - Select and process payouts via PesaWise
  - View processing, completed, and failed payouts
  - Monthly payout processing

- **System Analytics**
  - Total tips across all restaurants
  - Total commissions earned
  - Active waiters count
  - System-wide statistics

**Payment Flow**:
```
Customer Tips → PesaWise STK Push → YourApps PesaWise Balance
                                            ↓
                                    Commission Deducted
                                            ↓
                        Monthly Payout Processing (Super Admin)
                                            ↓
                    PesaWise Send to Mobile → Waiter M-Pesa
                    PesaWise Send to Mobile → Restaurant M-Pesa
```

---

### 2. Restaurant Dashboard - `/dashboard/[restaurantId]`
**Purpose**: Each restaurant manages their own operations

**Access**: Restaurant owners/managers (per restaurant)

**Features**:
- **Tip Analytics**
  - View tips collected (their restaurant only)
  - Daily, weekly, monthly statistics
  - Tip breakdown by waiter
  - Commission deducted (view only, cannot edit)

- **Waiter Management**
  - Add new waiters
  - Edit waiter information (name, phone, photo)
  - Remove waiters
  - Activate/deactivate waiters
  - View waiter tip earnings

- **QR Code Management**
  - Generate QR codes for tables
  - View/download QR codes
  - Manage table assignments

- **Distribution Settings**
  - Configure tip distribution groups
  - Set distribution percentages

**What Restaurants CANNOT Do**:
- Cannot edit commission rate (only YourApps can)
- Cannot process payouts (only YourApps can)
- Cannot see other restaurants' data
- Cannot access PesaWise wallet

---

## Payment Integration (PesaWise Only)

### Inflow - Tips Collection
**Endpoint**: `/api/payments/stk-push`
**Method**: STK Push (M-Pesa prompt on customer phone)

**Flow**:
1. Customer scans QR code at table
2. Selects waiter and tip amount
3. Enters M-Pesa phone number
4. PesaWise sends STK Push
5. Customer enters M-Pesa PIN
6. Money goes to YourApps PesaWise balance
7. Tip recorded in database with commission calculated

### Outflow - Payouts
**Endpoint**: `/api/payments/create-direct-payment`
**Method**: Direct Payment (Send to Mobile)

**Flow**:
1. Super Admin selects pending payouts
2. System calculates net amounts (after commission)
3. PesaWise bulk payment API called
4. Money sent from YourApps PesaWise balance to:
   - Waiter M-Pesa accounts
   - Restaurant M-Pesa account (for restaurant tips)
5. Payout status updated to completed

---

## Commission System

### How It Works:
1. Each restaurant has a configurable commission rate (default 10%)
2. When tip is received:
   - Gross Amount: KES 1000
   - Commission (10%): KES 100
   - Net Amount: KES 900

3. Database stores:
   - `amount`: 1000 (gross)
   - `commission_amount`: 100
   - `net_amount`: 900

4. Monthly payout:
   - Waiter receives: KES 900
   - YourApps keeps: KES 100

### Editing Commission:
- Only Super Admin can edit
- Go to `/admin` → Restaurants tab
- Click "Edit" on commission rate
- Enter new percentage (0-100%)
- Applies to NEW tips only (existing tips unchanged)

---

## Monthly Payout Process

### Automated Flow:
1. System generates pending payouts at end of month
2. Super Admin reviews pending payouts at `/admin/payouts`
3. Super Admin selects payouts to process
4. Click "Process Payouts"
5. System calls PesaWise bulk payment API
6. Money sent from YourApps PesaWise balance
7. Payouts marked as completed
8. Notifications sent to waiters/restaurants

### Manual Override:
- Super Admin can process payouts anytime
- Can select specific payouts
- Can retry failed payouts

---

## Database Schema (Key Tables)

### restaurants
- `id`, `name`, `slug`
- `commission_rate` (editable by Super Admin)
- `is_active`
- `mpesa_phone_number` (for restaurant payouts)

### waiters
- `id`, `name`, `phone_number`
- `restaurant_id`
- `is_active`

### tips
- `id`, `amount`, `commission_amount`, `net_amount`
- `restaurant_id`, `waiter_id`, `table_id`
- `payment_method` (always 'mpesa')
- `payment_status`
- `transaction_id` (PesaWise reference)

### payouts
- `id`, `amount`, `payout_type` (waiter/restaurant)
- `restaurant_id`, `waiter_id`
- `status` (pending/processing/completed/failed)
- `transaction_reference` (PesaWise transaction ID)

---

## API Endpoints

### Super Admin Only:
- `GET /api/admin/pesawise/wallet` - View PesaWise wallet
- `POST /api/admin/payouts/process` - Process payouts
- `PUT /api/admin/restaurants/[id]/commission` - Edit commission rate

### Restaurant Dashboard:
- `GET /api/restaurants/[id]/tips` - View restaurant tips
- `POST /api/restaurants/[id]/waiters` - Add waiter
- `PUT /api/restaurants/[id]/waiters/[waiterId]` - Edit waiter
- `DELETE /api/restaurants/[id]/waiters/[waiterId]` - Remove waiter

### Public:
- `POST /api/payments` - Create tip and initiate payment
- `GET /api/payments/[tipId]/status` - Check payment status

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# PesaWise (Test Environment)
PESAWISE_API_KEY=app_6vQ50aNKkB
PESAWISE_SECRET_KEY=udWnRUgd4k
PESAWISE_BALANCE_ID=1102801
PESAWISE_API_URL=https://api.pesawise.com
PESAWISE_ENVIRONMENT=sandbox

# App
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok-free.dev
```

---

## Access URLs

- **Customer Tipping**: `http://localhost:3000/tip/[restaurantId]/[tableId]`
- **Super Admin**: `http://localhost:3000/admin`
- **Payout Management**: `http://localhost:3000/admin/payouts`
- **Restaurant Dashboard**: `http://localhost:3000/dashboard/[restaurantId]`

---

## Key Points

1. **All payments via PesaWise** - No Stripe, no M-Pesa Daraja, no Paystack
2. **YourApps controls payouts** - Restaurants cannot process their own payouts
3. **Commission is editable** - Per restaurant, by Super Admin only
4. **Monthly payout cycle** - But can be processed anytime by Super Admin
5. **Two separate dashboards** - Super Admin (YourApps) vs Restaurant (individual)
6. **PesaWise balance is central** - All money flows through YourApps PesaWise account
