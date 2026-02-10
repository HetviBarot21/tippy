/**
 * Payout notification service for sending notifications to waiters and restaurants
 * about upcoming payouts and payout status updates
 */

import { createClient } from '@/utils/supabase/server';
import { Tables } from '@/types_db';
import { PayoutNotification } from '@/types/payout';

type Payout = Tables<'payouts'>;
type Waiter = Tables<'waiters'>;
type Restaurant = Tables<'restaurants'>;

export interface NotificationTemplate {
  type: 'upcoming' | 'processed' | 'failed';
  subject: string;
  message: string;
}

export interface NotificationResult {
  success: boolean;
  recipient: string;
  method: 'sms' | 'email' | 'push';
  error?: string;
}

export interface BulkNotificationResult {
  success: boolean;
  total_notifications: number;
  successful_notifications: number;
  failed_notifications: number;
  results: NotificationResult[];
  errors: string[];
}

export class PayoutNotificationService {
  private supabase = createClient();

  /**
   * Generate notification templates for different payout events
   */
  private getNotificationTemplate(
    type: 'upcoming' | 'processed' | 'failed',
    amount: number,
    waiterName?: string,
    groupName?: string,
    payoutDate?: string
  ): NotificationTemplate {
    const recipient = waiterName || groupName || 'recipient';
    const formattedAmount = `KES ${amount.toFixed(2)}`;

    switch (type) {
      case 'upcoming':
        return {
          type: 'upcoming',
          subject: 'Upcoming Tip Payout Notification',
          message: `Hello ${recipient}, your tip payout of ${formattedAmount} will be processed on ${payoutDate || 'the scheduled date'}. Ensure your phone number is active to receive the payment.`
        };

      case 'processed':
        return {
          type: 'processed',
          subject: 'Tip Payout Processed Successfully',
          message: `Hello ${recipient}, your tip payout of ${formattedAmount} has been processed successfully. You should receive the payment shortly on your registered phone number.`
        };

      case 'failed':
        return {
          type: 'failed',
          subject: 'Tip Payout Failed',
          message: `Hello ${recipient}, we encountered an issue processing your tip payout of ${formattedAmount}. Please contact support or ensure your phone number is correct and active.`
        };

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }

  /**
   * Send SMS notification (placeholder - integrate with SMS provider)
   */
  private async sendSMS(phoneNumber: string, message: string): Promise<NotificationResult> {
    try {
      // TODO: Integrate with SMS provider (e.g., Twilio, Africa's Talking)
      console.log(`SMS to ${phoneNumber}: ${message}`);
      
      // Simulate SMS sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        recipient: phoneNumber,
        method: 'sms'
      };

    } catch (error) {
      return {
        success: false,
        recipient: phoneNumber,
        method: 'sms',
        error: error instanceof Error ? error.message : 'SMS sending failed'
      };
    }
  }

  /**
   * Send email notification (placeholder - integrate with email provider)
   */
  private async sendEmail(email: string, subject: string, message: string): Promise<NotificationResult> {
    try {
      // TODO: Integrate with email provider (e.g., SendGrid, Resend)
      console.log(`Email to ${email}: ${subject}\n${message}`);
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        recipient: email,
        method: 'email'
      };

    } catch (error) {
      return {
        success: false,
        recipient: email,
        method: 'email',
        error: error instanceof Error ? error.message : 'Email sending failed'
      };
    }
  }

  /**
   * Send notification for upcoming payout (3 days before processing)
   */
  async sendUpcomingPayoutNotification(payout: Payout): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      if (payout.payout_type === 'waiter' && payout.waiter_id) {
        // Get waiter details
        const { data: waiter, error: waiterError } = await this.supabase
          .from('waiters')
          .select('name, phone_number, email')
          .eq('id', payout.waiter_id)
          .single();

        if (waiterError || !waiter) {
          throw new Error('Waiter not found');
        }

        const template = this.getNotificationTemplate(
          'upcoming',
          payout.amount,
          waiter.name,
          undefined,
          this.formatPayoutDate(payout.payout_month)
        );

        // Send SMS notification
        if (waiter.phone_number) {
          const smsResult = await this.sendSMS(waiter.phone_number, template.message);
          results.push(smsResult);
        }

        // Send email notification if email is available
        if (waiter.email) {
          const emailResult = await this.sendEmail(waiter.email, template.subject, template.message);
          results.push(emailResult);
        }

      } else if (payout.payout_type === 'group') {
        // For group payouts, notify restaurant admin
        const { data: restaurant, error: restaurantError } = await this.supabase
          .from('restaurants')
          .select('name, email, phone_number')
          .eq('id', payout.restaurant_id)
          .single();

        if (restaurantError || !restaurant) {
          throw new Error('Restaurant not found');
        }

        const template = this.getNotificationTemplate(
          'upcoming',
          payout.amount,
          undefined,
          payout.group_name || 'Distribution Group',
          this.formatPayoutDate(payout.payout_month)
        );

        // Send email to restaurant
        if (restaurant.email) {
          const emailResult = await this.sendEmail(restaurant.email, template.subject, template.message);
          results.push(emailResult);
        }

        // Send SMS if phone number is available
        if (restaurant.phone_number) {
          const smsResult = await this.sendSMS(restaurant.phone_number, template.message);
          results.push(smsResult);
        }
      }

    } catch (error) {
      console.error('Error sending upcoming payout notification:', error);
      results.push({
        success: false,
        recipient: 'unknown',
        method: 'sms',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return results;
  }

  /**
   * Send notification for processed payout
   */
  async sendProcessedPayoutNotification(payout: Payout): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      if (payout.payout_type === 'waiter' && payout.waiter_id) {
        const { data: waiter, error: waiterError } = await this.supabase
          .from('waiters')
          .select('name, phone_number, email')
          .eq('id', payout.waiter_id)
          .single();

        if (waiterError || !waiter) {
          throw new Error('Waiter not found');
        }

        const template = this.getNotificationTemplate('processed', payout.amount, waiter.name);

        if (waiter.phone_number) {
          const smsResult = await this.sendSMS(waiter.phone_number, template.message);
          results.push(smsResult);
        }

        if (waiter.email) {
          const emailResult = await this.sendEmail(waiter.email, template.subject, template.message);
          results.push(emailResult);
        }

      } else if (payout.payout_type === 'group') {
        const { data: restaurant, error: restaurantError } = await this.supabase
          .from('restaurants')
          .select('name, email, phone_number')
          .eq('id', payout.restaurant_id)
          .single();

        if (restaurantError || !restaurant) {
          throw new Error('Restaurant not found');
        }

        const template = this.getNotificationTemplate(
          'processed',
          payout.amount,
          undefined,
          payout.group_name || 'Distribution Group'
        );

        if (restaurant.email) {
          const emailResult = await this.sendEmail(restaurant.email, template.subject, template.message);
          results.push(emailResult);
        }

        if (restaurant.phone_number) {
          const smsResult = await this.sendSMS(restaurant.phone_number, template.message);
          results.push(smsResult);
        }
      }

    } catch (error) {
      console.error('Error sending processed payout notification:', error);
      results.push({
        success: false,
        recipient: 'unknown',
        method: 'sms',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return results;
  }

  /**
   * Send notification for failed payout
   */
  async sendFailedPayoutNotification(payout: Payout): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      if (payout.payout_type === 'waiter' && payout.waiter_id) {
        const { data: waiter, error: waiterError } = await this.supabase
          .from('waiters')
          .select('name, phone_number, email')
          .eq('id', payout.waiter_id)
          .single();

        if (waiterError || !waiter) {
          throw new Error('Waiter not found');
        }

        const template = this.getNotificationTemplate('failed', payout.amount, waiter.name);

        if (waiter.phone_number) {
          const smsResult = await this.sendSMS(waiter.phone_number, template.message);
          results.push(smsResult);
        }

        if (waiter.email) {
          const emailResult = await this.sendEmail(waiter.email, template.subject, template.message);
          results.push(emailResult);
        }

      } else if (payout.payout_type === 'group') {
        const { data: restaurant, error: restaurantError } = await this.supabase
          .from('restaurants')
          .select('name, email, phone_number')
          .eq('id', payout.restaurant_id)
          .single();

        if (restaurantError || !restaurant) {
          throw new Error('Restaurant not found');
        }

        const template = this.getNotificationTemplate(
          'failed',
          payout.amount,
          undefined,
          payout.group_name || 'Distribution Group'
        );

        if (restaurant.email) {
          const emailResult = await this.sendEmail(restaurant.email, template.subject, template.message);
          results.push(emailResult);
        }

        if (restaurant.phone_number) {
          const smsResult = await this.sendSMS(restaurant.phone_number, template.message);
          results.push(smsResult);
        }
      }

    } catch (error) {
      console.error('Error sending failed payout notification:', error);
      results.push({
        success: false,
        recipient: 'unknown',
        method: 'sms',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return results;
  }

  /**
   * Send bulk notifications for upcoming payouts (3 days before processing)
   */
  async sendBulkUpcomingPayoutNotifications(payouts: Payout[]): Promise<BulkNotificationResult> {
    const allResults: NotificationResult[] = [];
    const errors: string[] = [];

    console.log(`Sending upcoming payout notifications for ${payouts.length} payouts...`);

    for (const payout of payouts) {
      try {
        const results = await this.sendUpcomingPayoutNotification(payout);
        allResults.push(...results);

        // Add small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Payout ${payout.id}: ${errorMessage}`);
        console.error(`Failed to send notification for payout ${payout.id}:`, errorMessage);
      }
    }

    const successfulNotifications = allResults.filter(r => r.success).length;

    return {
      success: errors.length === 0,
      total_notifications: allResults.length,
      successful_notifications: successfulNotifications,
      failed_notifications: allResults.length - successfulNotifications,
      results: allResults,
      errors
    };
  }

  /**
   * Get payouts that need upcoming notifications (3 days before payout date)
   */
  async getPayoutsNeedingUpcomingNotifications(): Promise<Payout[]> {
    // Calculate the date 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const targetMonth = threeDaysFromNow.toISOString().slice(0, 7); // YYYY-MM format

    // Get the last day of the target month (typical payout date)
    const lastDayOfMonth = new Date(threeDaysFromNow.getFullYear(), threeDaysFromNow.getMonth() + 1, 0);
    const isPayoutNotificationDay = Math.abs(threeDaysFromNow.getTime() - lastDayOfMonth.getTime()) <= 24 * 60 * 60 * 1000; // Within 1 day

    if (!isPayoutNotificationDay) {
      return []; // Not the right time to send notifications
    }

    const { data: payouts, error } = await this.supabase
      .from('payouts')
      .select(`
        *,
        waiters(name, phone_number, email),
        restaurants(name, email, phone_number)
      `)
      .eq('payout_month', targetMonth)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching payouts for notifications:', error);
      throw new Error('Failed to fetch payouts for notifications');
    }

    return payouts || [];
  }

  /**
   * Format payout date for display in notifications
   */
  private formatPayoutDate(payoutMonth: string): string {
    const date = new Date(`${payoutMonth}-01`);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    return lastDay.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Schedule and send upcoming payout notifications
   * This would typically be called by a cron job 3 days before month end
   */
  async processUpcomingPayoutNotifications(): Promise<BulkNotificationResult> {
    try {
      const payouts = await this.getPayoutsNeedingUpcomingNotifications();
      
      if (payouts.length === 0) {
        return {
          success: true,
          total_notifications: 0,
          successful_notifications: 0,
          failed_notifications: 0,
          results: [],
          errors: []
        };
      }

      return await this.sendBulkUpcomingPayoutNotifications(payouts);

    } catch (error) {
      console.error('Error processing upcoming payout notifications:', error);
      return {
        success: false,
        total_notifications: 0,
        successful_notifications: 0,
        failed_notifications: 0,
        results: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

// Export singleton instance
export const payoutNotificationService = new PayoutNotificationService();