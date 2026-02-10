#!/usr/bin/env node

/**
 * Comprehensive System Validation Script
 * Validates all requirements from the QR Tipping System spec
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class ValidationReport {
  constructor() {
    this.passed = [];
    this.failed = [];
    this.warnings = [];
  }

  pass(category, message) {
    this.passed.push({ category, message });
    console.log(`${colors.green}✓${colors.reset} [${category}] ${message}`);
  }

  fail(category, message, details = '') {
    this.failed.push({ category, message, details });
    console.log(`${colors.red}✗${colors.reset} [${category}] ${message}`);
    if (details) console.log(`  ${colors.yellow}→${colors.reset} ${details}`);
  }

  warn(category, message) {
    this.warnings.push({ category, message });
    console.log(`${colors.yellow}⚠${colors.reset} [${category}] ${message}`);
  }

  summary() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${colors.cyan}VALIDATION SUMMARY${colors.reset}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`${colors.green}Passed:${colors.reset} ${this.passed.length}`);
    console.log(`${colors.red}Failed:${colors.reset} ${this.failed.length}`);
    console.log(`${colors.yellow}Warnings:${colors.reset} ${this.warnings.length}`);
    
    if (this.failed.length > 0) {
      console.log(`\n${colors.red}CRITICAL ISSUES:${colors.reset}`);
      this.failed.forEach(({ category, message, details }) => {
        console.log(`  • [${category}] ${message}`);
        if (details) console.log(`    ${details}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}WARNINGS:${colors.reset}`);
      this.warnings.forEach(({ category, message }) => {
        console.log(`  • [${category}] ${message}`);
      });
    }

    console.log(`\n${'='.repeat(80)}\n`);
    
    return this.failed.length === 0;
  }
}

const report = new ValidationReport();

// Helper function to check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

// Helper function to check if directory exists
function dirExists(dirPath) {
  return fs.existsSync(path.join(__dirname, '..', dirPath));
}

// Helper function to read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
  } catch (error) {
    return null;
  }
}

// Helper function to check if content contains pattern
function contentContains(filePath, pattern) {
  const content = readFile(filePath);
  if (!content) return false;
  return pattern.test(content);
}

console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
console.log(`${colors.cyan}QR TIPPING SYSTEM - COMPREHENSIVE VALIDATION${colors.reset}`);
console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

// ============================================================================
// REQUIREMENT 1: QR Code Scanning and Tipping Interface
// ============================================================================
console.log(`\n${colors.blue}[REQUIREMENT 1] QR Code Scanning Interface${colors.reset}`);

if (fileExists('app/tip/[restaurantId]/[tableId]/page.tsx')) {
  report.pass('REQ-1', 'Tipping interface page exists');
} else {
  report.fail('REQ-1', 'Tipping interface page missing', 'app/tip/[restaurantId]/[tableId]/page.tsx not found');
}

if (fileExists('components/ui/TippingInterface/TippingInterface.tsx')) {
  report.pass('REQ-1', 'TippingInterface component exists');
} else {
  report.fail('REQ-1', 'TippingInterface component missing');
}

if (fileExists('components/ui/TippingInterface/TipTypeSelection.tsx')) {
  report.pass('REQ-1', 'Tip type selection component exists');
} else {
  report.fail('REQ-1', 'Tip type selection component missing');
}

// ============================================================================
// REQUIREMENT 2: Waiter Selection
// ============================================================================
console.log(`\n${colors.blue}[REQUIREMENT 2] Waiter Selection${colors.reset}`);

if (fileExists('components/ui/TippingInterface/WaiterSelection.tsx')) {
  report.pass('REQ-2', 'Waiter selection component exists');
} else {
  report.fail('REQ-2', 'Waiter selection component missing');
}

if (fileExists('app/api/restaurants/[id]/waiters/route.ts')) {
  report.pass('REQ-2', 'Waiter API endpoint exists');
} else {
  report.fail('REQ-2', 'Waiter API endpoint missing');
}

// ============================================================================
// REQUIREMENT 3: Payment Processing
// ============================================================================
console.log(`\n${colors.blue}[REQUIREMENT 3] Payment Processing${colors.reset}`);

if (fileExists('components/ui/TippingInterface/AmountEntry.tsx')) {
  report.pass('REQ-3', 'Amount entry component exists');
} else {
  report.fail('REQ-3', 'Amount entry component missing');
}

if (fileExists('components/ui/TippingInterface/PaymentInterface.tsx')) {
  report.pass('REQ-3', 'Payment interface component exists');
} else {
  report.fail('REQ-3', 'Payment interface component missing');
}

if (fileExists('utils/mpesa/service.ts')) {
  report.pass('REQ-3', 'M-Pesa service exists');
} else {
  report.fail('REQ-3', 'M-Pesa service missing');
}

if (fileExists('app/api/webhooks/mpesa/callback/route.ts')) {
  report.pass('REQ-3', 'M-Pesa webhook handler exists');
} else {
  report.fail('REQ-3', 'M-Pesa webhook handler missing');
}

if (fileExists('app/api/webhooks/stripe/route.ts')) {
  report.pass('REQ-3', 'Stripe webhook handler exists');
} else {
  report.fail('REQ-3', 'Stripe webhook handler missing');
}

// ============================================================================
// REQUIREMENT 4: Commission Management
// ============================================================================
console.log(`\n${colors.blue}[REQUIREMENT 4] Commission Management${colors.reset}`);

if (fileExists('utils/commission/service.ts')) {
  report.pass('REQ-4', 'Commission service exists');
} else {
  report.fail('REQ-4', 'Commission service missing');
}

if (fileExists('app/api/admin/commission/route.ts')) {
  report.pass('REQ-4', 'Commission management API exists');
} else {
  report.fail('REQ-4', 'Commission management API missing');
}

if (fileExists('components/ui/CommissionDashboard/CommissionDashboard.tsx')) {
  report.pass('REQ-4', 'Commission dashboard component exists');
} else {
  report.fail('REQ-4', 'Commission dashboard component missing');
}

// ============================================================================
// REQUIREMENT 5: Tip Distribution
// ============================================================================
console.log(`\n${colors.blue}[REQUIREMENT 5] Tip Distribution${colors.reset}`);

if (fileExists('utils/distribution/service.ts')) {
  report.pass('REQ-5', 'Distribution service exists');
} else {
  report.fail('REQ-5', 'Distribution service missing');
}

if (fileExists('app/api/restaurants/[id]/distribution/route.ts')) {
  report.pass('REQ-5', 'Distribution API endpoint exists');
} else {
  report.fail('REQ-5', 'Distribution API endpoint missing');
}

if (fileExists('components/ui/DistributionManager/DistributionGroupManager.tsx')) {
  report.pass('REQ-5', 'Distribution group manager component exists');
} else {
  report.fail('REQ-5', 'Distribution group manager component missing');
}

// ============================================================================
// REQUIREMENT 6: Restaurant Admin Dashboard
// ============================================================================
console.log(`\n${colors.blue}[REQUIREMENT 6] Restaurant Admin Dashboard${colors.reset}`);

if (fileExists('app/dashboard/[restaurantId]/page.tsx')) {
  report.pass('REQ-6', 'Restaurant dashboard page exists');
} else {
  report.fail('REQ-6', 'Restaurant dashboard page missing');
}

if (fileExists('components/ui/Analytics/TipAnalyticsDashboard.tsx')) {
  report.pass('REQ-6', 'Tip analytics dashboard exists');
} else {
  report.fail('REQ-6', 'Tip analytics dashboard missing');
}

if (fileExists('app/api/restaurants/[id]/analytics/route.ts')) {
  report.pass('REQ-6', 'Analytics API endpoint exists');
} else {
  report.fail('REQ-6', 'Analytics API endpoint missing');
}

// ============================================================================
// REQUIREMENT 7: Monthly Payouts
// ============================================================================
console.log(`\n${colors.blue}[REQUIREMENT 7] Monthly Payouts${colors.reset}`);

if (fileExists('utils/payouts/service.ts')) {
  report.pass('REQ-7', 'Payout service exists');
} else {
  report.fail('REQ-7', 'Payout service missing');
}

if (fileExists('utils/payouts/processor.ts')) {
  report.pass('REQ-7', 'Payout processor exists');
} else {
  report.fail('REQ-7', 'Payout processor missing');
}

if (fileExists('utils/mpesa/bulk-payments.ts')) {
  report.pass('REQ-7', 'M-Pesa bulk payments service exists');
} else {
  report.fail('REQ-7', 'M-Pesa bulk payments service missing');
}

if (fileExists('utils/payments/bank-transfers.ts')) {
  report.pass('REQ-7', 'Bank transfer service exists');
} else {
  report.fail('REQ-7', 'Bank transfer service missing');
}

if (fileExists('app/api/restaurants/[id]/payouts/route.ts')) {
  report.pass('REQ-7', 'Payout API endpoint exists');
} else {
  report.fail('REQ-7', 'Payout API endpoint missing');
}

// ============================================================================
// REQUIREMENT 8: Waiter and QR Code Management
// ============================================================================
console.log(`\n${colors.blue}[REQUIREMENT 8] Waiter and QR Code Management${colors.reset}`);

if (fileExists('components/ui/WaiterManagement/WaiterManagementDashboard.tsx')) {
  report.pass('REQ-8', 'Waiter management dashboard exists');
} else {
  report.fail('REQ-8', 'Waiter management dashboard missing');
}

if (fileExists('utils/qr-codes/service.ts')) {
  report.pass('REQ-8', 'QR code service exists');
} else {
  report.fail('REQ-8', 'QR code service missing');
}

if (fileExists('components/ui/QRCodeManager/QRCodeManager.tsx')) {
  report.pass('REQ-8', 'QR code manager component exists');
} else {
  report.fail('REQ-8', 'QR code manager component missing');
}

if (fileExists('app/api/qr-codes/route.ts')) {
  report.pass('REQ-8', 'QR code API endpoint exists');
} else {
  report.fail('REQ-8', 'QR code API endpoint missing');
}

// ============================================================================
// REQUIREMENT 9: Multi-Tenant Architecture
// ============================================================================
console.log(`\n${colors.blue}[REQUIREMENT 9] Multi-Tenant Architecture${colors.reset}`);

if (fileExists('middleware.ts')) {
  report.pass('REQ-9', 'Middleware exists');
} else {
  report.fail('REQ-9', 'Middleware missing');
}

if (fileExists('utils/auth/tenant-context.ts')) {
  report.pass('REQ-9', 'Tenant context utility exists');
} else {
  report.fail('REQ-9', 'Tenant context utility missing');
}

if (fileExists('utils/supabase/tenant-client.ts')) {
  report.pass('REQ-9', 'Tenant-aware Supabase client exists');
} else {
  report.fail('REQ-9', 'Tenant-aware Supabase client missing');
}

if (fileExists('supabase/migrations/20240205_tenant_security.sql')) {
  report.pass('REQ-9', 'Tenant security migration exists');
} else {
  report.fail('REQ-9', 'Tenant security migration missing');
}

if (fileExists('components/ui/SuperAdmin/SuperAdminDashboard.tsx')) {
  report.pass('REQ-9', 'Super admin dashboard exists');
} else {
  report.fail('REQ-9', 'Super admin dashboard missing');
}

if (fileExists('app/admin/page.tsx')) {
  report.pass('REQ-9', 'Admin page exists');
} else {
  report.fail('REQ-9', 'Admin page missing');
}

// ============================================================================
// DATABASE SCHEMA VALIDATION
// ============================================================================
console.log(`\n${colors.blue}[DATABASE] Schema Validation${colors.reset}`);

const migrations = [
  '20230530034630_init.sql',
  '20240202_multi_tenant_schema.sql',
  '20240203_tip_distributions.sql',
  '20240204_bank_accounts.sql',
  '20240205_tenant_security.sql'
];

migrations.forEach(migration => {
  if (fileExists(`supabase/migrations/${migration}`)) {
    report.pass('DATABASE', `Migration ${migration} exists`);
  } else {
    report.fail('DATABASE', `Migration ${migration} missing`);
  }
});

// ============================================================================
// TESTING INFRASTRUCTURE
// ============================================================================
console.log(`\n${colors.blue}[TESTING] Test Coverage${colors.reset}`);

const testFiles = [
  'tests/qr-codes.test.js',
  'tests/tipping-flow.test.js',
  'tests/tipping-integration.test.js',
  'tests/payment-integration.test.js',
  'tests/commission-calculations.test.js',
  'tests/distribution-calculations.test.js',
  'tests/mpesa-integration.test.js',
  'tests/payout-calculations.test.js',
  'tests/payout-processing.test.js',
  'tests/security/tenant-isolation.test.js',
  'tests/security/api-security.test.js'
];

testFiles.forEach(testFile => {
  if (fileExists(testFile)) {
    report.pass('TESTING', `Test file ${testFile} exists`);
  } else {
    report.warn('TESTING', `Test file ${testFile} missing`);
  }
});

// ============================================================================
// DEPENDENCIES CHECK
// ============================================================================
console.log(`\n${colors.blue}[DEPENDENCIES] Package Validation${colors.reset}`);

const packageJson = JSON.parse(readFile('package.json'));
const requiredDeps = {
  'next': 'Next.js framework',
  'react': 'React library',
  '@supabase/supabase-js': 'Supabase client',
  'stripe': 'Stripe payment processing',
  'qrcode': 'QR code generation',
  'zod': 'Schema validation'
};

Object.entries(requiredDeps).forEach(([dep, description]) => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    report.pass('DEPENDENCIES', `${dep} (${description})`);
  } else {
    report.fail('DEPENDENCIES', `${dep} missing`, description);
  }
});

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================
console.log(`\n${colors.blue}[ENVIRONMENT] Configuration Check${colors.reset}`);

if (fileExists('.env.local')) {
  const envContent = readFile('.env.local');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY'
  ];

  requiredEnvVars.forEach(envVar => {
    if (envContent.includes(envVar)) {
      report.pass('ENVIRONMENT', `${envVar} configured`);
    } else {
      report.warn('ENVIRONMENT', `${envVar} not found in .env.local`);
    }
  });
} else {
  report.fail('ENVIRONMENT', '.env.local file missing', 'Copy from .env.local.example');
}

// ============================================================================
// SECURITY CHECKS
// ============================================================================
console.log(`\n${colors.blue}[SECURITY] Security Implementation${colors.reset}`);

if (fileExists('tests/security/tenant-isolation.test.js')) {
  report.pass('SECURITY', 'Tenant isolation tests exist');
} else {
  report.fail('SECURITY', 'Tenant isolation tests missing');
}

if (fileExists('tests/security/api-security.test.js')) {
  report.pass('SECURITY', 'API security tests exist');
} else {
  report.fail('SECURITY', 'API security tests missing');
}

if (fileExists('utils/payments/validation.ts')) {
  report.pass('SECURITY', 'Payment validation utility exists');
} else {
  report.fail('SECURITY', 'Payment validation utility missing');
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================
const isReady = report.summary();

if (isReady) {
  console.log(`${colors.green}✓ System is ready for testing!${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}✗ System has critical issues that need to be resolved.${colors.reset}\n`);
  process.exit(1);
}
