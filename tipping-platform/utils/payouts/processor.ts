/**
 * Payout processing service that handles M-Pesa bulk payments and payout status tracking
 */

import { createClient } from '@/utils/supabase/server';
import { Tables } from '@/types_db';
import { payoutService } from './service';
import { payoutNotificationService } from './notifications';
import { mpesaBulkPaymentService, BulkPayoutRequest } from '@/utils/mpesa/bulk-payments';

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
   * Process pending waiter payouts using M-Pesa bulk payments
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

    console.log(`Processing ${waiterPayouts.length} waiter payouts...`);

    // Get waiter details for payouts
    const waiterIds = waiterPayouts.map(p => p.waiter_id).filter(Boolean) as string[];
    const { data: waiters, error: waitersError } = await this.supabase
      .from('waiters')
      .select('id, name, phone_number')
      .in('id', waiterIds);

    if (waitersError) {
      throw new Error('Failed to fetch waiter details');
    }

    // Prepare bulk payout requests
    const bulkPayoutRequests: BulkPayoutRequest[] = waiterPayouts.map(payout => {
      const waiter = waiters?.find(w => w.id === payout.waiter_id);
      if (!waiter) {
        throw new Error(`Waiter not found for payout ${payout.id}`);
      }

      return {
        waiter_id: payout.waiter_id!,
        waiter_name: waiter.name,
        phone_number: waiter.phone_number,
        amount: payout.amount,
        payout_id: payout.id,
        reference: `PAYOUT-${payout.id.slice(-8)}`
      };
    });

    let bulkResult;
    const errors: string[] = [];

    if (dryRun) {
      console.log('DRY RUN: Simulating M-Pesa bulk payments...');
      // Simulate successful processing for dry run
      bulkResult = {
        success: true,
        total_payouts: bulkPayoutRequests.length,
        successful_payouts: bulkPayoutRequests.length,
        failed_payouts: 0,
        total_amount: bulkPayoutRequests.reduce((sum, req) => sum + req.amount, 0),
        results: bulkPayoutRequests.map(req => ({
          success: true,
          payout_id: req.payout_id,
          waiter_name: req.waiter_name,
          amount: req.amount,
          conversation_id: `DRY-RUN-${Date.now()}`,
          originator_conversation_id: `DRY-RUN-ORIG-${Date.now()}`
        })),
        errors: []
      };
    } else {
      // Process actual M-Pesa bulk payments
      try {
        bulkResult = await mpesaBulkPaymentService.processBulkPayouts(bulkPayoutRequests);
      } catch (error) {
        console.error('M-Pesa bulk payment processing failed:', error);
        errors.push(`M-Pesa bulk payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
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

    // Update payout statuses based on M-Pesa results
    for (const result of bulkResult.results) {
      try {
        if (result.success) {
          // Update payout status to processing with transaction reference
          await payoutService.updatePayoutStatus(
            result.payout_id,
            'processing',
            result.conversation_id
          );

          // Send processed notification
          const payout = waiterPayouts.find(p => p.id === result.payout_id);
          if (payout) {
            await payoutNotificationService.sendProcessedPayoutNotification(payout);
          }

        } else {
          // Update payout status to failed
          await payoutService.updatePayoutStatus(result.payout_id, 'failed');

          // Send failed notification
          const payout = waiterPayouts.find(p => p.id === result.payout_id);
          if (payout) {
            await payoutNotificationService.sendFailedPayoutNotification(payout);
          }

          errors.push(`Waiter payout failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error updating payout status for ${result.payout_id}:`, error);
        errors.push(`Failed to update payout status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: bulkResult.success,
      processed: bulkResult.successful_payouts,
      failed: bulkResult.failed_payouts,
      total_amount: bulkResult.total_amount,
      results: bulkResult.results,
      errors: [...errors, ...bulkResult.errors]
    };
  }

  /**
   * Process group payouts using bank transfer integration
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

    console.log(`Processing ${groupPayouts.length} group payouts...`);

    if (dryRun) {
      // Simulate successful processing for dry run
      const results = groupPayouts.map(payout => ({
        success: true,
        payout_id: payout.id,
        group_name: payout.group_name,
        amount: payout.amount,
        transaction_id: `DRY-RUN-BANK-${Date.now()}`,
        reference: `PAYOUT-${payout.id.slice(-8)}`
      }));

      // Update statuses to processing for dry run
      for (const payout of groupPayouts) {
        await payoutService.updatePayoutStatus(
          payout.id,
          'processing',
          `DRY-RUN-BANK-${Date.now()}`
        );
      }

      const totalAmount = groupPayouts.reduce((sum, p) => sum + p.amount, 0);

      return {
        success: true,
        processed: groupPayouts.length,
        failed: 0,
        total_amount: totalAmount,
        results,
        errors: []
      };
    }

    // Process actual bank transfers
    try {
      const { bankTransferService } = await import('@/utils/payments/bank-transfers');
      const bulkResult = await bankTransferService.processBulkBankTransfers(groupPayouts);

      // Update payout statuses based on bank transfer results
      for (const result of bulkResult.results) {
        try {
          if (result.success) {
            // Update payout status to processing with transaction reference
            await payoutService.updatePayoutStatus(
              result.payout_id,
              'processing',
              result.transaction_id || result.reference
            );

            // Send processed notification
            const payout = groupPayouts.find(p => p.id === result.payout_id);
            if (payout) {
              await payoutNotificationService.sendProcessedPayoutNotification(payout);
            }

          } else {
            // Update payout status to failed
            await payoutService.updatePayoutStatus(result.payout_id, 'failed');

            // Send failed notification
            const payout = groupPayouts.find(p => p.id === result.payout_id);
            if (payout) {
              await payoutNotificationService.sendFailedPayoutNotification(payout);
            }
          }
        } catch (error) {
          console.error(`Error updating payout status for ${result.payout_id}:`, error);
        }
      }

      return {
        success: bulkResult.success,
        processed: bulkResult.successful_transfers,
        failed: bulkResult.failed_transfers,
        total_amount: bulkResult.total_amount,
        results: bulkResult.results,
        errors: bulkResult.errors
      };

    } catch (error) {
      console.error('Bank transfer processing failed:', error);
      
      // Mark all payouts as failed
      for (const payout of groupPayouts) {
        try {
          await payoutService.updatePayoutStatus(payout.id, 'failed');
          await payoutNotificationService.sendFailedPayoutNotification(payout);
        } catch (updateError) {
          console.error(`Error updating failed payout ${payout.id}:`, updateError);
        }
      }

      return {
        success: false,
        processed: 0,
        failed: groupPayouts.length,
        total_amount: 0,
        results: groupPayouts.map(payout => ({
          success: false,
          payout_id: payout.id,
          group_name: payout.group_name,
          amount: payout.amount,
          error: error instanceof Error ? error.message : 'Bank transfer failed'
        })),
        errors: [error instanceof Error ? error.message : 'Bank transfer processing failed']
      };
    }
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
   * Handle M-Pesa B2C callback to update payout status
   */
  async handleMPesaB2CCallback(callbackData: any): Promise<void> {
    try {
      const transactionDetails = mpesaBulkPaymentService.extractB2CTransactionDetails(callbackData);
      
      if (!transactionDetails) {
        console.error('Invalid B2C callback data:', callbackData);
        return;
      }

      // Find payout by conversation ID
      const { data: payouts, error } = await this.supabase
        .from('payouts')
        .select('*')
        .eq('transaction_reference', transactionDetails.conversationId)
        .eq('status', 'processing');

      if (error || !payouts || payouts.length === 0) {
        console.error('Payout not found for conversation ID:', transactionDetails.conversationId);
        return;
      }

      const payout = payouts[0];
      const status = mpesaBulkPaymentService.parseB2CTransactionStatus(transactionDetails.resultCode);

      // Update payout status
      await payoutService.updatePayoutStatus(
        payout.id,
        status,
        transactionDetails.transactionId
      );

      // Send notification based on status
      if (status === 'completed') {
        await payoutNotificationService.sendProcessedPayoutNotification(payout);
      } else {
        await payoutNotificationService.sendFailedPayoutNotification(payout);
      }

      console.log(`Updated payout ${payout.id} status to ${status} (Transaction: ${transactionDetails.transactionId})`);

    } catch (error) {
      console.error('Error handling M-Pesa B2C callback:', error);
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