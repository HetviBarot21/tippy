# Quick Start Testing Guide

## ✅ System Status: READY FOR TESTING

All requirements implemented. Build passing. 66/66 validation checks passed.

---

## Quick Validation

Run the comprehensive validation:
```bash
node scripts/comprehensive-validation.js
```

Expected output: `✓ System is ready for testing!`

---

## Start Testing in 3 Steps

### 1. Setup Local Environment

```bash
# Install dependencies (if not already done)
npm install

# Start local Supabase
npm run supabase:start

# Copy environment variables
# (Already configured in .env.local)

# Run database migrations
npm run supabase:reset
```

### 2. Seed Demo Data

```bash
# Create test restaurants, waiters, and QR codes
npm run seed:demo
```

### 3. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Test Scenarios

### Scenario 1: Customer Tips a Waiter
1. Navigate to `/tip/[restaurantId]/[tableId]` (get IDs from seed data)
2. Select "Tip Waiter"
3. Choose a waiter from the list
4. Enter tip amount (e.g., 100 KES)
5. Select payment method (M-Pesa or Card)
6. Complete payment

**Expected:** Payment processed, tip recorded, commission deducted

### Scenario 2: Customer Tips Restaurant
1. Navigate to tipping interface
2. Select "Tip Restaurant"
3. Enter tip amount
4. Complete payment

**Expected:** Tip distributed according to configured percentages

### Scenario 3: Restaurant Admin Views Dashboard
1. Login as restaurant admin
2. Navigate to `/dashboard/[restaurantId]`
3. View tip analytics
4. Check waiter performance
5. Review distribution breakdowns

**Expected:** Real-time data displayed correctly

### Scenario 4: Admin Manages Waiters
1. Go to waiter management section
2. Add new waiter
3. Edit waiter details
4. Deactivate a waiter

**Expected:** CRUD operations work, validation enforced

### Scenario 5: Admin Configures Distribution
1. Navigate to distribution settings
2. Modify group percentages
3. Save changes

**Expected:** Percentages must sum to 100%, applied to future tips only

### Scenario 6: Super Admin Onboards Restaurant
1. Login as super admin
2. Navigate to `/admin`
3. Use onboarding form
4. Create new restaurant tenant

**Expected:** New tenant created with isolated data

---

## Run Automated Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
# QR Code tests
npm run test:qr

# Payment integration
node --test tests/payment-integration.test.js

# Security tests
node scripts/run-security-tests.js

# M-Pesa integration
node scripts/test-mpesa.js

# Payout system
node scripts/test-payout-system.js
```

---

## Payment Testing

### M-Pesa Sandbox
```bash
# Test M-Pesa integration
node scripts/test-mpesa.js

# Use sandbox phone numbers:
# +254712345678 (test number)
```

### Stripe Test Mode
Use test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC

---

## Verify Security

```bash
# Run security validation
node scripts/validate-security.js

# Run security test suite
node scripts/run-security-tests.js
```

**Key Security Features to Test:**
- Tenant isolation (can't access other restaurant's data)
- Authentication required for admin routes
- Payment validation
- SQL injection prevention

---

## Check Build

```bash
npm run build
```

Expected: `✓ Compiled successfully` (with minor warnings about import casing)

---

## Common Issues & Solutions

### Issue: Supabase connection error
**Solution:** Ensure local Supabase is running: `npm run supabase:status`

### Issue: Payment webhook not received
**Solution:** 
- For Stripe: Use Stripe CLI `npm run stripe:listen`
- For M-Pesa: Ensure callback URL is accessible

### Issue: Missing environment variables
**Solution:** Check `.env.local` has all required variables

### Issue: Database migration errors
**Solution:** Reset database: `npm run supabase:reset`

---

## Monitoring During Testing

### Check Logs
- Browser console for frontend errors
- Terminal for API errors
- Supabase dashboard for database queries

### Verify Data
- Check Supabase Studio: http://localhost:54323
- View tables: tips, payouts, restaurants, waiters
- Verify RLS policies are enforcing tenant isolation

---

## Performance Testing

### Load Testing (Optional)
```bash
# Install k6 or similar tool
# Run load tests on key endpoints:
# - /api/payments/route
# - /api/qr-codes/route
# - /api/restaurants/[id]/tips/route
```

---

## Before Moving to Production

- [ ] All tests passing
- [ ] Security audit complete
- [ ] Update webhook secrets
- [ ] Configure production payment credentials
- [ ] Update callback URLs with production domain
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Load testing completed
- [ ] User acceptance testing done

---

## Need Help?

### Documentation
- Full readiness report: `READINESS_REPORT.md`
- Testing guide: `TESTING_GUIDE.md`
- Payment providers: `docs/PAYMENT_PROVIDERS.md`
- Requirements: `.kiro/specs/qr-tipping-system/requirements.md`
- Design: `.kiro/specs/qr-tipping-system/design.md`

### Validation Scripts
- `scripts/comprehensive-validation.js` - Full system check
- `scripts/validate-security.js` - Security validation
- `scripts/test-mpesa.js` - M-Pesa testing
- `scripts/test-payout-system.js` - Payout testing

---

## Success Criteria

✅ System is ready for production when:
1. All automated tests pass
2. Manual test scenarios complete successfully
3. Security validation passes
4. Performance meets requirements
5. User acceptance testing approved
6. Production environment configured

---

**Last Updated:** February 10, 2026  
**Status:** ✅ READY FOR TESTING
