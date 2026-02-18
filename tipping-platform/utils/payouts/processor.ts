/**
 * Payout processing service that handles M-Pesa bulk payments and payout status tracking
 */

import { createClient } from '@/utils/supabase/server';
import { Tables } from '@/types_db';
import { payoutService } from './service';
import { payoutNotificationService } from './notifications';
import { pesaWiseBulkPaymentService, BulkPaymentRecipient } from '@/utils/pesawise/bulk-payments';

type Payout = Tables<'payouts'>;

export interface PayoutProcessingOptions {
  restaurantId?: string;
  payoutIds?: string[];
  dryRun?: boolean; // For testing without actual payments
}

export interface PayoutProcessingResult {
  success: boolean;
  total_payouts: number;
  processed_payouts: number;
  failed_payouts: number;
  total_amount: number;
  waiter_payouts: number;
  group_payouts: number;
  errors: string[];
  details: {
    waiter_results: any[];
    group_results: any[];
  };
}

export class PayoutProcessor {
  private supabase = createClient();

  /**
   * Process pending waiter payouts using PesaWise bulk payments
   */
  async processWaiterPayouts(payouts: Payout[], dryRun = false): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    total_amount: number;
    results: any[];
    errors: string[];
  }> {
    const waiterPayouts = payouts.filter(p => p.payout_type === 'waiter' && p.waiter_id);
    
    if (waiterPayouts.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        total_amount: 0,
        results: [],
        errors: []
      };
    }

    console.log(`Processing ${waiterPayouts.length} waiter payouts via PesaWise...`);

    // Get waiter details for payouts
    const waiterIds = waiterPayouts.map(p => p.waiter_id).filter(Boolean) as string[];
    const { data: waiters, error: waitersError } = await this.supabase
      .from('waiters')
      .select('id, name, phone_number')
      .in('id', waiterIds);

    if (waitersError) {
      throw new Error('Failed to fetch waiter details');
    }

    // Prepare bulk payout recipients
    const recipients: BulkPaymentRecipient[] = waiterPayouts.map(payout => {
      const waiter = waiters?.find(w => w.id === payout.waiter_id);
      if (!waiter) {
        throw new Error(`Waiter not found for payout ${payout.id}`);
      }

      return {
        phoneNumber: waiter.phone_number,
        amount: payout.amount,
        reference: `PAYOUT-${payout.id.slice(-8)}`,
        name: waiter.name
      };
    });

    let bulkResult;
    const errors: string[] = [];

    if (dryRun) {
      console.log('DRY RUN: Simulating PesaWise bulk payments...');
      // Simulate successful processing for dry run
      bulkResult = {
        success: true,
        message: 'Dry run completed',
        totalAmount: recipients.reduce((sum, r) => sum + r.amount, 0),
        totalRecipients: recipients.length,
        results: recipients.map((r, idx) => ({
          phoneNumber: r.phoneNumber,
          amount: r.amount,
          reference: r.reference,
          success: true,
          transactionId: `DRY-RUN-${Date.now()}-${idx}`
        }))
      };
    } else {
      // Process actual PesaWise bulk payments
      try {
        bulkResult = await pesaWiseBulkPaymentService.processBulkPayments({ recipients });
      } catch (error) {
        console.error('PesaWise bulk payment processing failed:', error);
        errors.push(`PesaWise bulk payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Return failure result
        return {
          success: false,
          processed: 0,
          failed: waiterPayouts.length,
          total_amount: 0,
          results: [],
          errors
        };
      }
    }

    // Update payout statuses based on PesaWise results
    let successCount = 0;
    let failCount = 0;

    if (bulkResult.results) {
      for (let i = 0; i < bulkResult.results.length; i++) {
        const result = bulkResult.results[i];
        const payout = waiterPayouts[i];

        try {
          if (result.success) {
            // Update payout status to completed with transaction reference
            await payoutService.updatePayoutStatus(
              payout.id,
              'completed',
              result.transactionId
            );

            // Send processed notification
            await payoutNotificationService.sendProcessedPayoutNotification(payout);
            successCount++;

          } else {
            // Update payout status to failed
            await payoutService.updatePayoutStatus(payout.id, 'failed');

            // Send failed notification
            await payoutNotificationService.sendFailedPayoutNotification(payout);

            errors.push(`Waiter payout failed: ${result.error}`);
            failCount++;
          }
        } catch (error) {
          console.error(`Error updating payout status for ${payout.id}:`, error);
          errors.push(`Failed to update payout status: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failCount++;
        }
      }
    }

    return {
      success: bulkResult.success,
      processed: successCount,
      failed: failCount,
      total_amount: bulkResult.totalAmount || 0,
      results: bulkResult.results || [],
      errors
    };
  }

  /**
   * Process group payouts using PesaWise
   */
  async processGroupPayouts(payouts: Payout[], dryRun = false): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    total_amount: number;
    results: any[];
    errors: string[];
  }> {
    const groupPayouts = payouts.filter(p => p.payout_type === 'group');
    
    if (groupPayouts.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        total_amount: 0,
        results: [],
        errors: []
      };
    }

    console.log(`Processing ${groupPayouts.length} group payouts via PesaWise...`);

    // Get distribution group details
    const groupIds = groupPayouts.map(p => p.distribution_group_id).filter(Boolean) as string[];
    const { data: groups, error: groupsError } = await this.supabase
      .from('distribution_groups')
      .select('id, name, phone_number')
      .in('id', groupIds);

    if (groupsError) {
      throw new Error('Failed to fetch distribution group details');
    }

    // Prepare bulk payout recipients
    const recipients: BulkPaymentRecipient[] = groupPayouts.map(payout => {
      const group = groups?.find(g => g.id === payout.distribution_group_id);
      if (!group || !group.phone_number) {
        throw new Error(`Group or phone number not found for payout ${payout.id}`);
      }

      return {
        phoneNumber: group.phone_number,
        amount: payout.amount,
        reference: `PAYOUT-${payout.id.slice(-8)}`,
        name: group.name
      };
    });

    let bulkResult;
    const errors: string[] = [];

    if (dryRun) {
      console.log('DRY RUN: Simulating PesaWise group payments...');
      bulkResult = {
        success: true,
        message: 'Dry run completed',
        totalAmount: recipients.reduce((sum, r) => sum + r.amount, 0),
        totalRecipients: recipients.length,
        results: recipients.map((r, idx) => ({
          phoneNumber: r.phoneNumber,
          amount: r.amount,
          reference: r.reference,
          success: true,
          transactionId: `DRY-RUN-GROUP-${Date.now()}-${idx}`
        }))
      };
    } else {
      // Process actual PesaWise bulk payments
      try {
        bulkResult = await pesaWiseBulkPaymentService.processBulkPayments({ recipients });
      } catch (error) {
        console.error('PesaWise group payment processing failed:', error);
        errors.push(`PesaWise group payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        return {
          success: false,
          processed: 0,
          failed: groupPayouts.length,
          total_amount: 0,
          results: [],
          errors
        };
      }
    }

    // Update payout statuses
    let successCount = 0;
    let failCount = 0;

    if (bulkResult.results) {
      for (let i = 0; i < bulkResult.results.length; i++) {
        const result = bulkResult.results[i];
        const payout = groupPayouts[i];

        try {
          if (result.success) {
            await payoutService.updatePayoutStatus(
              payout.id,
              'completed',
              result.transactionId
            );
            await payoutNotificationService.sendProcessedPayoutNotification(payout);
            successCount++;
          } else {
            await payoutService.updatePayoutStatus(payout.id, 'failed');
            await payoutNotificationService.sendFailedPayoutNotification(payout);
            errors.push(`Group payout failed: ${result.error}`);
            failCount++;
          }
        } catch (error) {
          console.error(`Error updating payout status for ${payout.id}:`, error);
          errors.push(`Failed to update payout status: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failCount++;
        }
      }
    }

    return {
      success: bulkResult.success,
      processed: successCount,
      failed: failCount,
      total_amount: bulkResult.totalAmount || 0,
      results: bulkResult.results || [],
      errors
    };
  }

  /**
   * Process all pending payouts for a restaurant or specific payout IDs
   */
  async processPayouts(options: PayoutProcessingOptions = {}): Promise<PayoutProcessingResult> {
    const { restaurantId, payoutIds, dryRun = false } = options;

    try {
      let payouts: Payout[];

      if (payoutIds && payoutIds.length > 0) {
        // Process specific payouts
        const { data, error } = await this.supabase
          .from('payouts')
          .select('*')
          .in('id', payoutIds)
          .eq('status', 'pending');

        if (error) throw error;
        payouts = data || [];

      } else if (restaurantId) {
        // Process all pending payouts for a restaurant
        payouts = await payoutService.getPayoutsForProcessing(restaurantId);

      } else {
        // Process all pending payouts across all restaurants
        payouts = await payoutService.getPayoutsForProcessing();
      }

      if (payouts.length === 0) {
        return {
          success: true,
          total_payouts: 0,
          processed_payouts: 0,
          failed_payouts: 0,
          total_amount: 0,
          waiter_payouts: 0,
          group_payouts: 0,
          errors: [],
          details: {
            waiter_results: [],
            group_results: []
          }
        };
      }

      console.log(`Processing ${payouts.length} payouts (${dryRun ? 'DRY RUN' : 'LIVE'})...`);

      // Process waiter payouts via M-Pesa
      const waiterResult = await this.processWaiterPayouts(payouts, dryRun);

      // Process group payouts via bank transfer
      const groupResult = await this.processGroupPayouts(payouts, dryRun);

      // Combine results
      const totalProcessed = waiterResult.processed + groupResult.processed;
      const totalFailed = waiterResult.failed + groupResult.failed;
      const totalAmount = waiterResult.total_amount + groupResult.total_amount;
      const allErrors = [...waiterResult.errors, ...groupResult.errors];

      const result: PayoutProcessingResult = {
        success: allErrors.length === 0,
        total_payouts: payouts.length,
        processed_payouts: totalProcessed,
        failed_payouts: totalFailed,
        total_amount: totalAmount,
        waiter_payouts: waiterResult.processed,
        group_payouts: groupResult.processed,
        errors: allErrors,
        details: {
          waiter_results: waiterResult.results,
          group_results: groupResult.results
        }
      };

      console.log(`Payout processing completed: ${totalProcessed}/${payouts.length} successful, KES ${totalAmount} total`);

      return result;

    } catch (error) {
      console.error('Error processing payouts:', error);
      return {
        success: false,
        total_payouts: 0,
        processed_payouts: 0,
        failed_payouts: 0,
        total_amount: 0,
        waiter_payouts: 0,
        group_payouts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        details: {
          waiter_results: [],
          group_results: []
        }
      };
    }
  }

  /**
   * Handle PesaWise payment callback to update payout status
   */
  async handlePesaWiseCallback(callbackData: any): Promise<void> {
    try {
      console.log('Processing PesaWise payout callback:', callbackData);
      
      // PesaWise callback structure may vary - adjust based on actual callback format
      const transactionId = callbackData.requestId || callbackData.transactionId;
      const status = callbackData.status === 'SUCCESS' ? 'completed' : 'failed';

      if (!transactionId) {
        console.error('No transaction ID in callback data');
        return;
      }

      // Find payout by transaction reference
      const { data: payouts, error } = await this.supabase
        .from('payouts')
        .select('*')
        .eq('transaction_reference', transactionId)
        .in('status', ['pending', 'processing']);

      if (error || !payouts || payouts.length === 0) {
        console.error('Payout not found for transaction ID:', transactionId);
        return;
      }

      const payout = payouts[0];

      // Update payout status
      await payoutService.updatePayoutStatus(payout.id, status, transactionId);

      // Send notification based on status
      if (status === 'completed') {
        await payoutNotificationService.sendProcessedPayoutNotification(payout);
      } else {
        await payoutNotificationService.sendFailedPayoutNotification(payout);
      }

      console.log(`Updated payout ${payout.id} status to ${status}`);

    } catch (error) {
      console.error('Error handling PesaWise callback:', error);
    }
  }

  /**
   * Retry failed payouts
   */
  async retryFailedPayouts(payoutIds: string[], dryRun = false): Promise<PayoutProcessingResult> {
    try {
      // Reset failed payouts to pending status
      const { error: resetError } = await this.supabase
        .from('payouts')
        .update({ 
          status: 'pending',
          transaction_reference: null,
          processed_at: null,
          updated_at: new Date().toISOString()
        })
        .in('id', payoutIds)
        .eq('status', 'failed');

      if (resetError) {
        throw new Error('Failed to reset payout statuses');
      }

      // Process the payouts again
      return await this.processPayouts({ payoutIds, dryRun });

    } catch (error) {
      console.error('Error retrying failed payouts:', error);
      return {
        success: false,
        total_payouts: 0,
        processed_payouts: 0,
        failed_payouts: 0,
        total_amount: 0,
        waiter_payouts: 0,
        group_payouts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        details: {
          waiter_results: [],
          group_results: []
        }
      };
    }
  }
}

// Export singleton instance
export const payoutProcessor = new PayoutProcessor();