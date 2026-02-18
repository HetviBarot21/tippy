/**
 * PesaWise Bulk Payment Service
 * Handles bulk payouts/disbursements to multiple recipients
 */

import { pesaWiseConfig, validatePesaWiseConfig } from './config';

export interface BulkPaymentRecipient {
  phoneNumber: string;
  amount: number;
  reference: string;
  name?: string;
}

export interface BulkPaymentRequest {
  recipients: BulkPaymentRecipient[];
  balanceId?: string;
}

export interface BulkPaymentResponse {
  success: boolean;
  message: string;
  batchId?: string;
  totalAmount?: number;
  totalRecipients?: number;
  results?: Array<{
    phoneNumber: string;
    amount: number;
    reference: string;
    success: boolean;
    transactionId?: string;
    error?: string;
  }>;
  error?: string;
}

export class PesaWiseBulkPaymentService {
  private config = pesaWiseConfig;

  constructor() {
    validatePesaWiseConfig();
  }

  /**
   * Get authentication headers
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api-key': this.config.apiKey,
      'api-secret': this.config.secretKey
    };
  }

  /**
   * Normalize phone number to 254XXXXXXXXX format
   */
  private normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  /**
   * Process bulk payments to multiple recipients
   * Uses individual payment requests since PesaWise bulk API details are limited
   */
  async processBulkPayments(request: BulkPaymentRequest): Promise<BulkPaymentResponse> {
    try {
      const { recipients, balanceId = this.config.balanceId } = request;

      if (!recipients || recipients.length === 0) {
        return {
          success: false,
          message: 'No recipients provided',
          error: 'Recipients array is empty'
        };
      }

      console.log(`Processing bulk payment for ${recipients.length} recipients...`);

      const results: Array<{
        phoneNumber: string;
        amount: number;
        reference: string;
        success: boolean;
        transactionId?: string;
        error?: string;
      }> = [];

      let totalAmount = 0;
      let successCount = 0;
      let failCount = 0;

      // Process each payment individually
      for (const recipient of recipients) {
        try {
          const normalizedPhone = this.normalizePhoneNumber(recipient.phoneNumber);
          
          const payload = {
            balanceId: balanceId,
            amount: recipient.amount,
            phoneNumber: normalizedPhone,
            reference: recipient.reference
          };

          const response = await fetch(`${this.config.baseUrl}/api/payments/create-direct-payment`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload)
          });

          const responseData = await response.json();

          if (response.ok && responseData.requestId) {
            results.push({
              phoneNumber: recipient.phoneNumber,
              amount: recipient.amount,
              reference: recipient.reference,
              success: true,
              transactionId: responseData.requestId
            });
            totalAmount += recipient.amount;
            successCount++;
          } else {
            results.push({
              phoneNumber: recipient.phoneNumber,
              amount: recipient.amount,
              reference: recipient.reference,
              success: false,
              error: responseData.detail || responseData.message || 'Payment failed'
            });
            failCount++;
          }

          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Error processing payment for ${recipient.phoneNumber}:`, error);
          results.push({
            phoneNumber: recipient.phoneNumber,
            amount: recipient.amount,
            reference: recipient.reference,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failCount++;
        }
      }

      const batchId = `BATCH-${Date.now()}`;

      return {
        success: successCount > 0,
        message: `Processed ${successCount}/${recipients.length} payments successfully`,
        batchId,
        totalAmount,
        totalRecipients: recipients.length,
        results
      };

    } catch (error) {
      console.error('Bulk payment processing failed:', error);
      return {
        success: false,
        message: 'Bulk payment processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process single payout (wrapper for consistency)
   */
  async processSinglePayout(
    phoneNumber: string,
    amount: number,
    reference: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      const payload = {
        balanceId: this.config.balanceId,
        amount: amount,
        phoneNumber: normalizedPhone,
        reference: reference
      };

      const response = await fetch(`${this.config.baseUrl}/api/payments/create-direct-payment`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.ok && responseData.requestId) {
        return {
          success: true,
          transactionId: responseData.requestId
        };
      } else {
        return {
          success: false,
          error: responseData.detail || responseData.message || 'Payment failed'
        };
      }

    } catch (error) {
      console.error('Single payout failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const pesaWiseBulkPaymentService = new PesaWiseBulkPaymentService();
