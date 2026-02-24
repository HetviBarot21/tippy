# Tippy Platform - Complete User Flow & Page Links

## 🔐 Authentication Pages

### Sign In
**URL:** http://localhost:3000/signin
- Login with email/password
- OAuth sign in options

**Test Credentials:**
```
Email:    admin@tippy.co.ke
Password: Admin123!@#
```

### Sign In with ID
**URL:** http://localhost:3000/signin/[id]
- Dynamic sign-in page with specific ID

---

## 👤 User Pages

### Account Page
**URL:** http://localhost:3000/account
- View user account information
- See restaurant access and roles
- Requires authentication

### Select Restaurant
**URL:** http://localhost:3000/select-restaurant
- Choose which restaurant to manage
- Shows all restaurants user has access to
- Redirects to restaurant dashboard

### Unauthorized
**URL:** http://localhost:3000/unauthorized
- Shown when user tries to access restricted resources

---

## 🏢 Admin Pages

### Super Admin Dashboard
**URL:** http://localhost:3000/admin
- System-wide statistics
- Manage all restaurants
- View PesaWise wallet
- Process payouts
- System analytics
- **Requires:** Super admin access

**Tabs:**
- Overview - System stats and quick actions
- Wallet - PesaWise wallet management
- Restaurants - Manage all restaurants
- Payouts - Process waiter payouts
- Analytics - System-wide analytics
- Support - Recent activity and tenant support

### Admin Payouts
**URL:** http://localhost:3000/admin/payouts
- Process bulk payouts
- View payout history
- **Requires:** Super admin access

---

## 🍽️ Restaurant Dashboard

### Restaurant Dashboard (Dynamic)
**URL Pattern:** http://localhost:3000/dashboard/[restaurantId]

**Demo Restaurants:**

1. **Mama Mia Italian Restaurant**
   - URL: http://localhost:3000/dashboard/12345678-1234-4567-8901-123456789012
   - Slug: mama-mia-italian

2. **Nyama Choma Palace**
   - URL: http://localhost:3000/dashboard/12345678-1234-4567-8901-123456789013
   - Slug: nyama-choma-palace

3. **Ocean Breeze Seafood**
   - URL: http://localhost:3000/dashboard/12345678-1234-4567-8901-123456789014
   - Slug: ocean-breeze-seafood

**Features:**
- Tip analytics
- Waiter management
- QR code management
- Tip distribution settings
- **Requires:** Restaurant admin or super admin access

---

## 💰 Tipping Pages (Public - No Login Required)

### Universal Tipping (Restaurant Only)
**URL Pattern:** http://localhost:3000/tip/[restaurantId]

**Demo Links:**
1. **Mama Mia** (by slug): http://localhost:3000/tip/mama-mia-italian
2. **Mama Mia** (by ID): http://localhost:3000/tip/12345678-1234-4567-8901-123456789012
3. **Nyama Choma** (by slug): http://localhost:3000/tip/nyama-choma-palace
4. **Ocean Breeze** (by slug): http://localhost:3000/tip/ocean-breeze-seafood

**Features:**
- Select waiter to tip
- Or tip the restaurant directly
- Choose tip amount
- Pay via M-Pesa or Card

### Table-Specific Tipping
**URL Pattern:** http://localhost:3000/tip/[restaurantId]/[tableId]

**Demo Links:**

**Mama Mia Tables:**
- Table 1 (Window): http://localhost:3000/tip/12345678-1234-4567-8901-123456789012/12345678-1234-4567-8901-123456789030
- Table 2 (Patio): http://localhost:3000/tip/12345678-1234-4567-8901-123456789012/12345678-1234-4567-8901-123456789031

**Nyama Choma Tables:**
- Table 1 (Garden View): http://localhost:3000/tip/12345678-1234-4567-8901-123456789013/12345678-1234-4567-8901-123456789032
- Table 2 (VIP Section): http://localhost:3000/tip/12345678-1234-4567-8901-123456789013/12345678-1234-4567-8901-123456789033

**Ocean Breeze Tables:**
- Table 1 (Ocean View): http://localhost:3000/tip/12345678-1234-4567-8901-123456789014/12345678-1234-4567-8901-123456789034

**Features:**
- Pre-selected table context
- Select waiter or tip restaurant
- Choose tip amount
- Pay via M-Pesa or Card

---

## 🔄 Complete User Flows

### Flow 1: Customer Tips a Waiter
1. Customer scans QR code on table
2. Opens: `/tip/[restaurantId]/[tableId]`
3. Sees restaurant name and table info
4. Selects their waiter from the list
5. Enters tip amount
6. Chooses payment method (M-Pesa or Card)
7. Completes payment
8. Receives confirmation

### Flow 2: Customer Tips Restaurant (No Specific Waiter)
1. Customer visits: `/tip/[restaurantId]`
2. Sees restaurant name
3. Chooses "Tip Restaurant" option
4. Enters tip amount
5. Chooses payment method
6. Completes payment
7. Tip goes to restaurant distribution pool

### Flow 3: Restaurant Admin Manages Tips
1. Admin logs in at `/signin`
2. Goes to `/select-restaurant`
3. Selects their restaurant
4. Redirected to `/dashboard/[restaurantId]`
5. Views tip analytics
6. Manages waiters
7. Generates QR codes
8. Configures tip distribution

### Flow 4: Super Admin Manages System
1. Super admin logs in at `/signin`
2. Goes to `/admin`
3. Views system-wide statistics
4. Manages all restaurants
5. Processes payouts via PesaWise
6. Views analytics and audit logs
7. Onboards new restaurants

---

## 🧪 Testing & Development

### Test Payment Page
**URL:** http://localhost:3000/test-payment
- Test M-Pesa and Card payments
- Sandbox environment
- View payment status

---

## 📊 Quick Access Links (Copy & Paste)

### Admin Access
```
Login: http://localhost:3000/signin
Admin Dashboard: http://localhost:3000/admin
Select Restaurant: http://localhost:3000/select-restaurant
```

### Public Tipping (No Login)
```
Mama Mia: http://localhost:3000/tip/mama-mia-italian
Nyama Choma: http://localhost:3000/tip/nyama-choma-palace
Ocean Breeze: http://localhost:3000/tip/ocean-breeze-seafood
```

### Restaurant Dashboards (Requires Login)
```
Mama Mia: http://localhost:3000/dashboard/12345678-1234-4567-8901-123456789012
Nyama Choma: http://localhost:3000/dashboard/12345678-1234-4567-8901-123456789013
Ocean Breeze: http://localhost:3000/dashboard/12345678-1234-4567-8901-123456789014
```

### Table QR Codes (Public)
```
Mama Mia Table 1: http://localhost:3000/tip/12345678-1234-4567-8901-123456789012/12345678-1234-4567-8901-123456789030
Nyama Choma Table 1: http://localhost:3000/tip/12345678-1234-4567-8901-123456789013/12345678-1234-4567-8901-123456789032
Ocean Breeze Table 1: http://localhost:3000/tip/12345678-1234-4567-8901-123456789014/12345678-1234-4567-8901-123456789034
```

---

## 🎯 Key Features by Page

| Page | Authentication | Key Features |
|------|---------------|--------------|
| `/tip/[restaurantId]` | ❌ Public | Universal tipping, waiter selection |
| `/tip/[restaurantId]/[tableId]` | ❌ Public | Table-specific tipping |
| `/signin` | ❌ Public | Login page |
| `/account` | ✅ Required | User profile, restaurant access |
| `/select-restaurant` | ✅ Required | Choose restaurant to manage |
| `/dashboard/[restaurantId]` | ✅ Required | Restaurant management |
| `/admin` | ✅ Super Admin | System-wide management |
| `/admin/payouts` | ✅ Super Admin | Payout processing |

---

## 🚀 Getting Started

1. **Start Supabase:** `npx supabase start`
2. **Run Dev Server:** `npm run dev` (in tipping-platform folder)
3. **Create Admin User:** `node scripts/create-admin-user.js`
4. **Seed Demo Data:** `node scripts/seed-demo-data.js`
5. **Login:** http://localhost:3000/signin
6. **Explore:** Use links above!
