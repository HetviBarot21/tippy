/**
 * Notification Service
 * 
 * Handles sending notifications to customers and restaurant staff
 */

'use server';

import { createClient } from '@/utils/supabase/admin';

export interface PaymentConfirmationData {
  tipId: string;
  customerPhone?: string;
  amount: number;
  transactionId: string;
  restaurantName: string;
  waiterName?: string;
  tipType: 'waiter' | 'restaurant';
}

/**
 * Send payment confirmation to customer
 * In a real implementation, this would integrate with SMS service like Africa's Talking
 */
export async function sendPaymentConfirmation(data: PaymentConfirmationData): Promise<boolean> {
  try {
    // For now, we'll just log the confirmation
    // In production, integrate with SMS service
    const message = generateConfirmationMessage(data);
    
    console.log('Payment confirmation:', {
      phone: data.customerPhone,
      message,
      tipId: data.tipId,
      transactionId: data.transactionId
    });
    
    // Store notification record for audit
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .insert({
        tip_id: data.tipId,
        recipient_phone: data.customerPhone,
        message,
        notification_type: 'payment_confirmation',
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to store notification record:', error);
      // Don't fail the whole process for notification storage error
    }
    
    return true;
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return false;
  }
}

/**
 * Generate payment confirmation message
 */
function generateConfirmationMessage(data: PaymentConfirmationData): string {
  const recipient = data.tipType === 'waiter' 
    ? `waiter ${data.waiterName}` 
    : data.restaurantName;
  
  return `Payment confirmed! Your tip of KES ${data.amount} for ${recipient} at ${data.restaurantName} has been processed. Transaction ID: ${data.transactionId}. Thank you!`;
}

/**
 * Send payout notification to waiter/restaurant
 */
export async function sendPayoutNotification(params: {
  recipientPhone: string;
  amount: number;
  payoutType: 'waiter' | 'group';
  recipientName: string;
  payoutDate: string;
}): Promise<boolean> {
  try {
    const message = `Payout notification: Your ${params.payoutType} payout of KES ${params.amount} will be processed on ${params.payoutDate}. Thank you for using Tippy!`;
    
    console.log('Payout notification:', {
      phone: params.recipientPhone,
      message,
      amount: params.amount,
      payoutType: params.payoutType
    });
    
    // In production, send actual SMS here
    
    return true;
  } catch (error) {
    console.error('Payout notification error:', error);
    return false;
  }
}