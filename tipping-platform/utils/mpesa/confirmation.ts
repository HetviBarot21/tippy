/**
 * M-Pesa payment confirmation utilities
 * Handles sending confirmation messages to customers after successful payments
 */

import { Tables } from '@/types_db';

export interface PaymentConfirmation {
  tipId: string;
  customerPhone: string;
  amount: number;
  mpesaReceiptNumber: string;
  restaurantName: string;
  waiterName?: string;
  tipType: 'waiter' | 'restaurant';
  transactionDate: string;
}

export class MPesaConfirmationService {
  
  /**
   * Generate confirmation message for customer
   */
  generateConfirmationMessage(confirmation: PaymentConfirmation): string {
    const { amount, mpesaReceiptNumber, restaurantName, waiterName, tipType } = confirmation;
    
    const recipient = tipType === 'waiter' && waiterName ? waiterName : restaurantName;
    const tipTypeText = tipType === 'waiter' ? 'waiter' : 'restaurant';
    
    return `Thank you! Your tip of KES ${amount} for ${recipient} (${tipTypeText}) has been confirmed. M-Pesa Receipt: ${mpesaReceiptNumber}. Your generosity is appreciated!`;
  }

  /**
   * Send SMS confirmation to customer (placeholder - integrate with SMS service)
   */
  async sendSMSConfirmation(confirmation: PaymentConfirmation): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // TODO: Integrate with SMS service (e.g., Africa's Talking, Twilio)
      // For now, just log the message that would be sent
      
      const message = this.generateConfirmationMessage(confirmation);
      
      console.log(`SMS Confirmation to ${confirmation.customerPhone}:`, message);
      
      // Simulate SMS sending
      return {
        success: true,
        message: 'SMS confirmation sent successfully'
      };
      
    } catch (error) {
      console.error('Error sending SMS confirmation:', error);
      return {
        success: false,
        message: 'Failed to send SMS confirmation'
      };
    }
  }

  /**
   * Log payment confirmation for audit purposes
   */
  async logPaymentConfirmation(confirmation: PaymentConfirmation): Promise<void> {
    try {
      // Log to console for now - in production, this could go to a logging service
      console.log('Payment Confirmation Logged:', {
        tipId: confirmation.tipId,
        amount: confirmation.amount,
        recipient: confirmation.tipType === 'waiter' ? confirmation.waiterName : confirmation.restaurantName,
        mpesaReceipt: confirmation.mpesaReceiptNumber,
        customerPhone: confirmation.customerPhone.replace(/(\d{3})\d{6}(\d{3})/, '$1******$2'), // Mask phone number
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging payment confirmation:', error);
    }
  }

  /**
   * Process complete payment confirmation workflow
   */
  async processPaymentConfirmation(
    tip: Tables<'tips'>,
    mpesaReceiptNumber: string,
    transactionDate: string,
    restaurantName: string,
    waiterName?: string
  ): Promise<void> {
    try {
      if (!tip.customer_phone) {
        console.log('No customer phone number available for confirmation');
        return;
      }

      const confirmation: PaymentConfirmation = {
        tipId: tip.id,
        customerPhone: tip.customer_phone,
        amount: tip.amount,
        mpesaReceiptNumber,
        restaurantName,
        waiterName,
        tipType: tip.tip_type,
        transactionDate
      };

      // Log the confirmation
      await this.logPaymentConfirmation(confirmation);

      // Send SMS confirmation
      const smsResult = await this.sendSMSConfirmation(confirmation);
      
      if (!smsResult.success) {
        console.error('Failed to send SMS confirmation:', smsResult.message);
      }

    } catch (error) {
      console.error('Error processing payment confirmation:', error);
    }
  }
}

// Export singleton instance
export const mpesaConfirmationService = new MPesaConfirmationService();