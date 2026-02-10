#!/usr/bin/env node

/**
 * Simple validation script for the payout system
 * This script validates that all the payout system components are properly structured
 */

const fs = require('fs');
const path = require('path');

class PayoutSystemValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  checkFileExists(filePath, description) {
    if (fs.existsSync(filePath)) {
      this.log(`${description}: Found`, 'success');
      return true;
    } else {
      this.errors.push(`${description}: Missing file ${filePath}`);
      this.log(`${description}: Missing file ${filePath}`, 'error');
      return false;
    }
  }

  checkFileContent(filePath, requiredContent, description) {
    if (!fs.existsSync(filePath)) {
      this.errors.push(`${description}: File ${filePath} does not exist`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const missing = requiredContent.filter(item => !content.includes(item));
    
    if (missing.length === 0) {
      this.log(`${description}: All required content found`, 'success');
      return true;
    } else {
      this.warnings.push(`${description}: Missing content - ${missing.join(', ')}`);
      this.log(`${description}: Missing content - ${missing.join(', ')}`, 'warning');
      return false;
    }
  }

  validatePayoutService() {
    this.log('Validating Payout Service...');
    
    const serviceFile = 'utils/payouts/service.ts';
    if (!this.checkFileExists(serviceFile, 'Payout Service')) return false;

    const requiredMethods = [
      'calculateMonthlyPayouts',
      'generatePayoutRecords',
      'getMonthlyPayouts',
      'hasPayoutsForMonth',
      'updatePayoutStatus',
      'processMonthlyPayoutsForAllRestaurants'
    ];

    return this.checkFileContent(serviceFile, requiredMethods, 'Payout Service Methods');
  }

  validateMPesaBulkPayments() {
    this.log('Validating M-Pesa Bulk Payments...');
    
    const bulkPaymentFile = 'utils/mpesa/bulk-payments.ts';
    if (!this.checkFileExists(bulkPaymentFile, 'M-Pesa Bulk Payments')) return false;

    const requiredMethods = [
      'sendB2CPayment',
      'processBulkPayouts',
      'validateB2CCallback',
      'extractB2CTransactionDetails',
      'parseB2CTransactionStatus'
    ];

    return this.checkFileContent(bulkPaymentFile, requiredMethods, 'M-Pesa Bulk Payment Methods');
  }

  validateBankTransfers() {
    this.log('Validating Bank Transfer Service...');
    
    const bankTransferFile = 'utils/payments/bank-transfers.ts';
    if (!this.checkFileExists(bankTransferFile, 'Bank Transfer Service')) return false;

    const requiredMethods = [
      'getBankAccounts',
      'upsertBankAccount',
      'sendBankTransfer',
      'processBulkBankTransfers',
      'validateBankAccount',
      'getSupportedBanks'
    ];

    return this.checkFileContent(bankTransferFile, requiredMethods, 'Bank Transfer Methods');
  }

  validatePayoutProcessor() {
    this.log('Validating Payout Processor...');
    
    const processorFile = 'utils/payouts/processor.ts';
    if (!this.checkFileExists(processorFile, 'Payout Processor')) return false;

    const requiredMethods = [
      'processWaiterPayouts',
      'processGroupPayouts',
      'processPayouts',
      'handleMPesaB2CCallback',
      'retryFailedPayouts'
    ];

    return this.checkFileContent(processorFile, requiredMethods, 'Payout Processor Methods');
  }

  validateNotificationService() {
    this.log('Validating Notification Service...');
    
    const notificationFile = 'utils/payouts/notifications.ts';
    if (!this.checkFileExists(notificationFile, 'Notification Service')) return false;

    const requiredMethods = [
      'sendUpcomingPayoutNotification',
      'sendProcessedPayoutNotification',
      'sendFailedPayoutNotification',
      'sendBulkUpcomingPayoutNotifications',
      'processUpcomingPayoutNotifications'
    ];

    return this.checkFileContent(notificationFile, requiredMethods, 'Notification Service Methods');
  }

  validateAPIEndpoints() {
    this.log('Validating API Endpoints...');
    
    const endpoints = [
      'app/api/restaurants/[id]/payouts/calculate/route.ts',
      'app/api/restaurants/[id]/payouts/generate/route.ts',
      'app/api/restaurants/[id]/payouts/route.ts',
      'app/api/restaurants/[id]/payouts/process/route.ts',
      'app/api/admin/payouts/process-monthly/route.ts',
      'app/api/admin/payouts/process/route.ts',
      'app/api/admin/payouts/notifications/route.ts',
      'app/api/restaurants/[id]/bank-accounts/route.ts',
      'app/api/banks/route.ts',
      'app/api/banks/validate/route.ts'
    ];

    let allFound = true;
    endpoints.forEach(endpoint => {
      if (!this.checkFileExists(endpoint, `API Endpoint: ${endpoint}`)) {
        allFound = false;
      }
    });

    return allFound;
  }

  validateWebhooks() {
    this.log('Validating Webhook Endpoints...');
    
    const webhooks = [
      'app/api/webhooks/mpesa/b2c/callback/route.ts',
      'app/api/webhooks/mpesa/b2c/timeout/route.ts',
      'app/api/webhooks/flutterwave/transfer/route.ts',
      'app/api/webhooks/paystack/transfer/route.ts'
    ];

    let allFound = true;
    webhooks.forEach(webhook => {
      if (!this.checkFileExists(webhook, `Webhook: ${webhook}`)) {
        allFound = false;
      }
    });

    return allFound;
  }

  validateDatabaseMigrations() {
    this.log('Validating Database Migrations...');
    
    const migrations = [
      'supabase/migrations/20240204_bank_accounts.sql'
    ];

    let allFound = true;
    migrations.forEach(migration => {
      if (!this.checkFileExists(migration, `Migration: ${migration}`)) {
        allFound = false;
      }
    });

    return allFound;
  }

  validateTests() {
    this.log('Validating Test Files...');
    
    const tests = [
      'tests/payout-calculations.test.js',
      'tests/mpesa-bulk-payments.test.js',
      'tests/bank-transfers.test.js',
      'tests/payout-processing.test.js'
    ];

    let allFound = true;
    tests.forEach(test => {
      if (!this.checkFileExists(test, `Test: ${test}`)) {
        allFound = false;
      }
    });

    return allFound;
  }

  validateTypeDefinitions() {
    this.log('Validating Type Definitions...');
    
    const typesFile = '../types/payout.ts';
    if (!this.checkFileExists(typesFile, 'Payout Types')) return false;

    const requiredTypes = [
      'PayoutCalculation',
      'WaiterPayoutCalculation',
      'GroupPayoutCalculation',
      'PayoutNotification',
      'MonthlyPayoutSummary'
    ];

    return this.checkFileContent(typesFile, requiredTypes, 'Payout Type Definitions');
  }

  async runValidation() {
    this.log('🚀 Starting Payout System Validation...');
    
    const validations = [
      () => this.validatePayoutService(),
      () => this.validateMPesaBulkPayments(),
      () => this.validateBankTransfers(),
      () => this.validatePayoutProcessor(),
      () => this.validateNotificationService(),
      () => this.validateAPIEndpoints(),
      () => this.validateWebhooks(),
      () => this.validateDatabaseMigrations(),
      () => this.validateTests(),
      () => this.validateTypeDefinitions()
    ];

    let passedValidations = 0;
    for (const validation of validations) {
      if (validation()) {
        passedValidations++;
      }
    }

    this.log(`\n📊 Validation Summary:`);
    this.log(`✅ Passed: ${passedValidations}/${validations.length} validations`);
    
    if (this.warnings.length > 0) {
      this.log(`⚠️  Warnings: ${this.warnings.length}`);
      this.warnings.forEach(warning => this.log(`   ${warning}`, 'warning'));
    }
    
    if (this.errors.length > 0) {
      this.log(`❌ Errors: ${this.errors.length}`);
      this.errors.forEach(error => this.log(`   ${error}`, 'error'));
      return false;
    }

    this.log('\n🎉 Payout System Validation Completed Successfully!', 'success');
    return true;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new PayoutSystemValidator();
  
  validator.runValidation()
    .then((success) => {
      if (success) {
        console.log('\n✅ All validations passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Some validations failed. Please check the errors above.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Validation failed with error:', error.message);
      process.exit(1);
    });
}

module.exports = { PayoutSystemValidator };