#!/usr/bin/env node

/**
 * Comprehensive test script for the payout system
 * This script tests the entire payout workflow from tip creation to payout processing
 */

import { createClient } from '@supabase/supabase-js';
import { payoutService } from '../utils/payouts/service.js';
import { payoutProcessor } from '../utils/payouts/processor.js';
import { payoutNotificationService } from '../utils/payouts/notifications.js';
import { mpesaBulkPaymentService } from '../utils/mpesa/bulk-payments.js';
import { bankTransferService } from '../utils/payments/bank-transfers.js';

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class PayoutSystemTester {
  constructor() {
    this.testData = {
      restaurantId: null,
      waiterIds: [],
      tableId: null,
      tipIds: [],
      payoutIds: []
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async createTestData() {
    await this.log('Creating test data...');

    try {
      // Create test restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: 'Payout Test Restaurant',
          slug: 'payout-test-restaurant',
          email: 'payout-test@example.com',
          commission_rate: 10.0
        })
        .select()
        .single();

      if (restaurantError) throw restaurantError;
      this.testData.restaurantId = restaurant.id;
      await this.log(`Created restaurant: ${restaurant.name} (${restaurant.id})`);

      // Create test waiters
      const { data: waiters, error: waitersError } = await supabase
        .from('waiters')
        .insert([
          {
            restaurant_id: this.testData.restaurantId,
            name: 'Alice Johnson',
            phone_number: '+254700000001',
            email: 'alice@example.com',
            is_active: true
          },
          {
            restaurant_id: this.testData.restaurantId,
            name: 'Bob Smith',
            phone_number: '+254700000002',
            email: 'bob@example.com',
            is_active: true
          },
          {
            restaurant_id: this.testData.restaurantId,
            name: 'Carol Davis',
            phone_number: '+254700000003',
            email: 'carol@example.com',
            is_active: true
          }
        ])
        .select();

      if (waitersError) throw waitersError;
      this.testData.waiterIds = waiters.map(w => w.id);
      await this.log(`Created ${waiters.length} waiters`);

      // Create test table
      const { data: table, error: tableError } = await supabase
        .from('qr_codes')
        .insert({
          restaurant_id: this.testData.restaurantId,
          table_number: 'T1',
          qr_data: 'test-payout-qr-data',
          is_active: true
        })
        .select()
        .single();

      if (tableError) throw tableError;
      this.testData.tableId = table.id;
      await this.log(`Created table: ${table.table_number}`);

      // Create distribution groups
      await supabase
        .from('distribution_groups')
        .insert([
          { restaurant_id: this.testData.restaurantId, group_name: 'Waiters', percentage: 50 },
          { restaurant_id: this.testData.restaurantId, group_name: 'Kitchen', percentage: 30 },
          { restaurant_id: this.testData.restaurantId, group_name: 'Cleaners', percentage: 10 },
          { restaurant_id: this.testData.restaurantId, group_name: 'Management', percentage: 10 }
        ]);

      await this.log('Created distribution groups');

      // Create bank accounts for groups
      await supabase
        .from('bank_accounts')
        .insert([
          {
            restaurant_id: this.testData.restaurantId,
            group_name: 'Waiters',
            account_name: 'Payout Test Restaurant - Waiters',
            account_number: '1111111111',
            bank_name: 'Equity Bank',
            bank_code: '068',
            is_active: true
          },
          {
            restaurant_id: this.testData.restaurantId,
            group_name: 'Kitchen',
            account_name: 'Payout Test Restaurant - Kitchen',
            account_number: '2222222222',
            bank_name: 'KCB Bank',
            bank_code: '001',
            is_active: true
          },
          {
            restaurant_id: this.testData.restaurantId,
            group_name: 'Management',
            account_name: 'Payout Test Restaurant - Management',
            account_number: '3333333333',
            bank_name: 'Cooperative Bank',
            bank_code: '011',
            is_active: true
          }
        ]);

      await this.log('Created bank accounts for distribution groups');

    } catch (error) {
      await this.log(`Error creating test data: ${error.message}`, 'error');
      throw error;
    }
  }

  async createTestTips() {
    await this.log('Creating test tips...');

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const tipDate = `${currentMonth}-15T12:00:00.000Z`;

      // Create various types of tips
      const tipData = [
        // Individual waiter tips
        {
          restaurant_id: this.testData.restaurantId,
          waiter_id: this.testData.waiterIds[0],
          table_id: this.testData.tableId,
          amount: 1000,
          commission_amount: 100,
          net_amount: 900,
          tip_type: 'waiter',
          payment_method: 'mpesa',
          payment_status: 'completed',
          created_at: tipDate
        },
        {
          restaurant_id: this.testData.restaurantId,
          waiter_id: this.testData.waiterIds[1],
          table_id: this.testData.tableId,
          amount: 750,
          commission_amount: 75,
          net_amount: 675,
          tip_type: 'waiter',
          payment_method: 'mpesa',
          payment_status: 'completed',
          created_at: tipDate
        },
        {
          restaurant_id: this.testData.restaurantId,
          waiter_id: this.testData.waiterIds[2],
          table_id: this.testData.tableId,
          amount: 500,
          commission_amount: 50,
          net_amount: 450,
          tip_type: 'waiter',
          payment_method: 'card',
          payment_status: 'completed',
          created_at: tipDate
        },
        // Restaurant-wide tips
        {
          restaurant_id: this.testData.restaurantId,
          waiter_id: null,
          table_id: this.testData.tableId,
          amount: 2000,
          commission_amount: 200,
          net_amount: 1800,
          tip_type: 'restaurant',
          payment_method: 'mpesa',
          payment_status: 'completed',
          created_at: tipDate
        },
        {
          restaurant_id: this.testData.restaurantId,
          waiter_id: null,
          table_id: this.testData.tableId,
          amount: 1500,
          commission_amount: 150,
          net_amount: 1350,
          tip_type: 'restaurant',
          payment_method: 'card',
          payment_status: 'completed',
          created_at: tipDate
        }
      ];

      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .insert(tipData)
        .select();

      if (tipsError) throw tipsError;
      this.testData.tipIds = tips.map(t => t.id);

      await this.log(`Created ${tips.length} tips (Total: KES ${tips.reduce((sum, t) => sum + t.amount, 0)})`);

      // Create tip distributions for restaurant tips
      const restaurantTips = tips.filter(t => t.tip_type === 'restaurant');
      for (const tip of restaurantTips) {
        await supabase
          .from('tip_distributions')
          .insert([
            {
              tip_id: tip.id,
              restaurant_id: this.testData.restaurantId,
              group_name: 'Waiters',
              percentage: 50,
              amount: tip.net_amount * 0.5
            },
            {
              tip_id: tip.id,
              restaurant_id: this.testData.restaurantId,
              group_name: 'Kitchen',
              percentage: 30,
              amount: tip.net_amount * 0.3
            },
            {
              tip_id: tip.id,
              restaurant_id: this.testData.restaurantId,
              group_name: 'Cleaners',
              percentage: 10,
              amount: tip.net_amount * 0.1
            },
            {
              tip_id: tip.id,
              restaurant_id: this.testData.restaurantId,
              group_name: 'Management',
              percentage: 10,
              amount: tip.net_amount * 0.1
            }
          ]);
      }

      await this.log(`Created tip distributions for ${restaurantTips.length} restaurant tips`);

    } catch (error) {
      await this.log(`Error creating test tips: ${error.message}`, 'error');
      throw error;
    }
  }

  async testPayoutCalculation() {
    await this.log('Testing payout calculation...');

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const calculation = await payoutService.calculateMonthlyPayouts({
        restaurantId: this.testData.restaurantId,
        month: currentMonth
      });

      await this.log(`Calculated payouts:`, 'success');
      await this.log(`  - Waiter payouts: ${calculation.waiter_payouts.length}`);
      await this.log(`  - Group payouts: ${calculation.group_payouts.length}`);
      await this.log(`  - Total amount: KES ${calculation.total_amount}`);
      await this.log(`  - Commission deducted: KES ${calculation.commission_deducted}`);

      // Verify calculations
      const expectedWaiterAmount = 900 + 675 + 450; // Individual waiter tips
      const actualWaiterAmount = calculation.waiter_payouts.reduce((sum, p) => sum + p.net_amount, 0);
      
      if (Math.abs(actualWaiterAmount - expectedWaiterAmount) > 0.01) {
        throw new Error(`Waiter payout calculation mismatch: expected ${expectedWaiterAmount}, got ${actualWaiterAmount}`);
      }

      await this.log('✅ Payout calculation verified', 'success');

      return calculation;

    } catch (error) {
      await this.log(`Error in payout calculation: ${error.message}`, 'error');
      throw error;
    }
  }

  async testPayoutGeneration(calculation) {
    await this.log('Testing payout generation...');

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const result = await payoutService.generatePayoutRecords(
        calculation,
        this.testData.restaurantId,
        currentMonth
      );

      if (!result.success) {
        throw new Error(`Payout generation failed: ${result.errors.join(', ')}`);
      }

      await this.log(`Generated ${result.payoutsCreated} payout records (KES ${result.totalAmount})`, 'success');

      // Get created payouts
      const payouts = await payoutService.getMonthlyPayouts(this.testData.restaurantId, currentMonth);
      this.testData.payoutIds = payouts.map(p => p.id);

      await this.log(`Payout breakdown:`);
      payouts.forEach(payout => {
        const type = payout.payout_type === 'waiter' ? 'Waiter' : `Group (${payout.group_name})`;
        this.log(`  - ${type}: KES ${payout.amount} (${payout.status})`);
      });

      return payouts;

    } catch (error) {
      await this.log(`Error in payout generation: ${error.message}`, 'error');
      throw error;
    }
  }

  async testPayoutProcessing() {
    await this.log('Testing payout processing (dry run)...');

    try {
      const result = await payoutProcessor.processPayouts({
        restaurantId: this.testData.restaurantId,
        dryRun: true
      });

      await this.log(`Payout processing results:`, 'success');
      await this.log(`  - Success: ${result.success}`);
      await this.log(`  - Total payouts: ${result.total_payouts}`);
      await this.log(`  - Processed: ${result.processed_payouts}`);
      await this.log(`  - Failed: ${result.failed_payouts}`);
      await this.log(`  - Waiter payouts: ${result.waiter_payouts}`);
      await this.log(`  - Group payouts: ${result.group_payouts}`);
      await this.log(`  - Total amount: KES ${result.total_amount}`);

      if (result.errors.length > 0) {
        await this.log(`Errors encountered:`, 'warning');
        result.errors.forEach(error => this.log(`  - ${error}`, 'warning'));
      }

      return result;

    } catch (error) {
      await this.log(`Error in payout processing: ${error.message}`, 'error');
      throw error;
    }
  }

  async testNotifications() {
    await this.log('Testing notification system...');

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const payouts = await payoutService.getMonthlyPayouts(this.testData.restaurantId, currentMonth);

      if (payouts.length === 0) {
        await this.log('No payouts found for notification testing', 'warning');
        return;
      }

      const testPayout = payouts[0];

      // Test upcoming notification
      const upcomingResult = await payoutNotificationService.sendUpcomingPayoutNotification(testPayout);
      await this.log(`Upcoming notification sent: ${upcomingResult.length} notifications`);

      // Test processed notification
      const processedResult = await payoutNotificationService.sendProcessedPayoutNotification(testPayout);
      await this.log(`Processed notification sent: ${processedResult.length} notifications`);

      // Test failed notification
      const failedResult = await payoutNotificationService.sendFailedPayoutNotification(testPayout);
      await this.log(`Failed notification sent: ${failedResult.length} notifications`);

      await this.log('✅ Notification system tested', 'success');

    } catch (error) {
      await this.log(`Error testing notifications: ${error.message}`, 'error');
      throw error;
    }
  }

  async testServiceConnections() {
    await this.log('Testing service connections...');

    try {
      // Test M-Pesa B2C connection
      const mpesaResult = await mpesaBulkPaymentService.testB2CConnection();
      await this.log(`M-Pesa B2C: ${mpesaResult.success ? '✅' : '❌'} ${mpesaResult.message}`);

      // Test bank transfer connection
      const bankResult = await bankTransferService.testConnection();
      await this.log(`Bank Transfer: ${bankResult.success ? '✅' : '❌'} ${bankResult.message} (${bankResult.provider || 'unknown'})`);

      // Test supported banks
      const banks = await bankTransferService.getSupportedBanks();
      await this.log(`Supported banks: ${banks.length} banks available`);

    } catch (error) {
      await this.log(`Error testing service connections: ${error.message}`, 'error');
      throw error;
    }
  }

  async testErrorScenarios() {
    await this.log('Testing error scenarios...');

    try {
      // Test with invalid restaurant ID
      const invalidResult = await payoutProcessor.processPayouts({
        restaurantId: 'invalid-id',
        dryRun: true
      });

      if (invalidResult.total_payouts !== 0) {
        throw new Error('Expected no payouts for invalid restaurant ID');
      }

      await this.log('✅ Invalid restaurant ID handled correctly');

      // Test with empty payout array
      const emptyResult = await payoutProcessor.processPayouts({
        restaurantId: this.testData.restaurantId,
        payoutIds: [],
        dryRun: true
      });

      if (emptyResult.total_payouts !== 0) {
        throw new Error('Expected no payouts for empty payout array');
      }

      await this.log('✅ Empty payout array handled correctly');

      await this.log('✅ Error scenarios tested', 'success');

    } catch (error) {
      await this.log(`Error testing error scenarios: ${error.message}`, 'error');
      throw error;
    }
  }

  async cleanup() {
    await this.log('Cleaning up test data...');

    try {
      // Clean up in reverse order of creation
      if (this.testData.payoutIds.length > 0) {
        await supabase.from('payouts').delete().in('id', this.testData.payoutIds);
        await this.log(`Deleted ${this.testData.payoutIds.length} payouts`);
      }

      if (this.testData.tipIds.length > 0) {
        await supabase.from('tip_distributions').delete().in('tip_id', this.testData.tipIds);
        await supabase.from('tips').delete().in('id', this.testData.tipIds);
        await this.log(`Deleted ${this.testData.tipIds.length} tips`);
      }

      if (this.testData.restaurantId) {
        await supabase.from('bank_accounts').delete().eq('restaurant_id', this.testData.restaurantId);
        await supabase.from('distribution_groups').delete().eq('restaurant_id', this.testData.restaurantId);
        await supabase.from('qr_codes').delete().eq('restaurant_id', this.testData.restaurantId);
        await supabase.from('waiters').delete().eq('restaurant_id', this.testData.restaurantId);
        await supabase.from('restaurants').delete().eq('id', this.testData.restaurantId);
        await this.log('Deleted restaurant and related data');
      }

      await this.log('✅ Cleanup completed', 'success');

    } catch (error) {
      await this.log(`Error during cleanup: ${error.message}`, 'error');
    }
  }

  async runFullTest() {
    const startTime = Date.now();
    await this.log('🚀 Starting comprehensive payout system test...');

    try {
      // Setup
      await this.createTestData();
      await this.createTestTips();

      // Core functionality tests
      const calculation = await this.testPayoutCalculation();
      const payouts = await this.testPayoutGeneration(calculation);
      await this.testPayoutProcessing();

      // Additional tests
      await this.testNotifications();
      await this.testServiceConnections();
      await this.testErrorScenarios();

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      await this.log(`🎉 All tests completed successfully in ${duration.toFixed(2)} seconds!`, 'success');

    } catch (error) {
      await this.log(`💥 Test failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PayoutSystemTester();
  
  tester.runFullTest()
    .then(() => {
      console.log('\n✅ Payout system test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Payout system test failed:', error.message);
      process.exit(1);
    });
}

export { PayoutSystemTester };