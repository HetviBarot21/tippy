/**
 * Payout Processing Service
 * 
 * Handles M-Pesa bulk payments for waiter payouts and notifications
 */

'use server';

import { mpesaClient } from '@/utils/mpesa/client';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import type { Payout } from '@/types/payout';

export interface PayoutProcessingResult {
  success: boolean;
  processed_count: number;
  failed_count: number;
  results: PayoutProcessingItem[];
  message: string;
}

export interface PayoutProcessingItem {
  payout_id: string;
  success: boolean;
  transaction_reference?: string;
  error?: string;
}

export interface PayoutNotificationResult {
  success: boolean;
  notifications_sent: number;
  message: string;
}

/**
 * Process M-Pesa payouts for waiters
 */
export async function processMpesaPayouts(
  payoutIds: string[]
): Promise<PayoutProcessingResult> {
  try {
    const adminSupabase = createAdminClient();
    
    // Get payout records
    const { data: payouts, error: fetchError } = await adminSupabase
      .from('payouts')
      .select(`
        *,
        waiter:waiters(name, phone_number),
        restaurant:restaurants(name)
      `)
      .in('id', payoutIds)
      .eq('payout_type', 'waiter')
      .eq('status', 'pending');

    if (fetchError) {
      throw new Error(`Failed to fetch payouts: ${fetchError.message}`);
    }

    if (!payouts || payouts.length === 0) {
      return {
        success: true,
        processed_count: 0,
        failed_count: 0,
        results: [],
        message: 'No pending waiter payouts found'
      };
    }

    // Update payouts to processing status
    const { error: updateError } = await adminSupabase
      .from('payouts')
      .update({ status: 'processing' })
      .in('id', payoutIds);

    if (updateError) {
      console.error('Failed to update payout status to processing:', updateError);
    }

    // Prepare bulk payment requests
    const paymentRequests = payouts.map(payout => ({
      phoneNumber: payout.waiter.phone_number,
      amount: Math.round(payout.amount), // M-Pesa requires integer amounts
      remarks: `Payout for ${payout.waiter.name} - ${payout.restaurant.name}`,
      reference: payout.id
    }));

    // Process bulk payments
    const paymentResults = await mpesaClient.processBulkB2CPayments(paymentRequests);
    
    const results: PayoutProcessingItem[] = [];
    let processedCount = 0;
    let failedCount = 0;

    // Update payout records based on results
    for (const result of paymentResults) {
      const payout = payouts.find(p => p.id === result.reference);
      if (!payout) continue;

      if (result.success) {
        // Update payout as completed
        const { error } = await adminSupabase
          .from('payouts')
          .update({
            status: 'completed',
            transaction_reference: result.conversationId,
            processed_at: new Date().toISOString()
          })
          .eq('id', result.reference);

        if (error) {
          console.error(`Failed to update payout ${result.reference}:`, error);
          results.push({
            payout_id: result.reference,
            success: false,
            error: 'Database update failed'
          });
          failedCount++;
        } else {
          results.push({
            payout_id: result.reference,
            success: true,
            transaction_reference: result.conversationId
          });
          processedCount++;
        }
      } else {
        // Update payout as failed
        const { error } = await adminSupabase
          .from('payouts')
          .update({
            status: 'failed',
            transaction_reference: `ERROR: ${result.error}`
          })
          .eq('id', result.reference);

        if (error) {
          console.error(`Failed to update failed payout ${result.reference}:`, error);
        }

        results.push({
          payout_id: result.reference,
          success: false,
          error: result.error
        });
        failedCount++;
      }
    }

    return {
      success: true,
      processed_count: processedCount,
      failed_count: failedCount,
      results,
      message: `Processed ${processedCount} payouts, ${failedCount} failed`
    };

  } catch (error) {
    console.error('Payout processing error:', error);
    
    // Revert payouts back to pending status on error
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase
        .from('payouts')
        .update({ status: 'pending' })
        .in('id', payoutIds)
        .eq('status', 'processing');
    } catch (revertError) {
      console.error('Failed to revert payout status:', revertError);
    }

    return {
      success: false,
      processed_count: 0,
      failed_count: payoutIds.length,
      results: payoutIds.map(id => ({
        payout_id: id,
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      })),
      message: error instanceof Error ? error.message : 'Payout processing failed'
    };
  }
}

/**
 * Send payout notifications 3 days before transfer
 */
export async function sendPayoutNotifications(
  month: string
): Promise<PayoutNotificationResult> {
  try {
    const adminSupabase = createAdminClient();
    
    // Calculate notification date (3 days before end of month)
    const monthDate = new Date(`${month}-01`);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const notificationDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), lastDay - 3);
    const today = new Date();
    
    // Only send notifications on the correct date
    if (today.toDateString() !== notificationDate.toDateString()) {
      return {
        success: true,
        notifications_sent: 0,
        message: 'Not the notification date yet'
      };
    }

    // Get pending payouts for the month
    const { data: payouts, error } = await adminSupabase
      .from('payouts')
      .select(`
        *,
        waiter:waiters(name, phone_number),
        restaurant:restaurants(name)
      `)
      .eq('payout_month', `${month}-01`)
      .eq('status', 'pending')
      .gte('amount', 100); // Only notify for payouts that meet minimum threshold

    if (error) {
      throw new Error(`Failed to fetch payouts: ${error.message}`);
    }

    if (!payouts || payouts.length === 0) {
      return {
        success: true,
        notifications_sent: 0,
        message: 'No pending payouts found for notification'
      };
    }

    let notificationsSent = 0;

    // Send notifications (this would integrate with SMS/email service)
    for (const payout of payouts) {
      try {
        const message = payout.payout_type === 'waiter' 
          ? `Hi ${payout.waiter?.name}, your tip payout of KES ${payout.amount} will be processed on ${lastDay}/${monthDate.getMonth() + 1}/${monthDate.getFullYear()}.`
          : `Payout notification for ${payout.group_name}: KES ${payout.amount} will be processed on ${lastDay}/${monthDate.getMonth() + 1}/${monthDate.getFullYear()}.`;

        // TODO: Integrate with SMS service (e.g., Africa's Talking, Twilio)
        console.log(`Notification for payout ${payout.id}: ${message}`);
        
        // For now, just log the notification
        // In production, you would send actual SMS/email here
        
        notificationsSent++;
      } catch (notificationError) {
        console.error(`Failed to send notification for payout ${payout.id}:`, notificationError);
      }
    }

    return {
      success: true,
      notifications_sent: notificationsSent,
      message: `Sent ${notificationsSent} payout notifications`
    };

  } catch (error) {
    console.error('Payout notification error:', error);
    return {
      success: false,
      notifications_sent: 0,
      message: error instanceof Error ? error.message : 'Notification sending failed'
    };
  }
}

/**
 * Retry failed payouts
 */
export async function retryFailedPayouts(
  payoutIds: string[]
): Promise<PayoutProcessingResult> {
  try {
    const adminSupabase = createAdminClient();
    
    // Reset failed payouts to pending
    const { error: resetError } = await adminSupabase
      .from('payouts')
      .update({ 
        status: 'pending',
        transaction_reference: null 
      })
      .in('id', payoutIds)
      .eq('status', 'failed');

    if (resetError) {
      throw new Error(`Failed to reset payout status: ${resetError.message}`);
    }

    // Process the payouts again
    return await processMpesaPayouts(payoutIds);

  } catch (error) {
    console.error('Retry failed payouts error:', error);
    return {
      success: false,
      processed_count: 0,
      failed_count: payoutIds.length,
      results: payoutIds.map(id => ({
        payout_id: id,
        success: false,
        error: error instanceof Error ? error.message : 'Retry failed'
      })),
      message: error instanceof Error ? error.message : 'Retry processing failed'
    };
  }
}

/**
 * Get payout processing status
 */
export async function getPayoutProcessingStatus(
  restaurantId: string,
  month: string
): Promise<{
  success: boolean;
  status: {
    total_payouts: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total_amount: number;
  };
  message: string;
}> {
  try {
    const adminSupabase = createAdminClient();
    
    const { data: payouts, error } = await adminSupabase
      .from('payouts')
      .select('status, amount')
      .eq('restaurant_id', restaurantId)
      .eq('payout_month', `${month}-01`);

    if (error) {
      throw new Error(`Failed to fetch payout status: ${error.message}`);
    }

    const status = {
      total_payouts: payouts?.length || 0,
      pending: payouts?.filter(p => p.status === 'pending').length || 0,
      processing: payouts?.filter(p => p.status === 'processing').length || 0,
      completed: payouts?.filter(p => p.status === 'completed').length || 0,
      failed: payouts?.filter(p => p.status === 'failed').length || 0,
      total_amount: payouts?.reduce((sum, p) => sum + p.amount, 0) || 0
    };

    return {
      success: true,
      status,
      message: 'Payout status retrieved successfully'
    };

  } catch (error) {
    console.error('Get payout status error:', error);
    return {
      success: false,
      status: {
        total_payouts: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total_amount: 0
      },
      message: error instanceof Error ? error.message : 'Failed to get payout status'
    };
  }
}