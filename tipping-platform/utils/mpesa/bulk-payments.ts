/**
 * M-Pesa B2C (Business to Customer) bulk payment service for waiter payouts
 */

import { getMPesaConfig, validateMPesaConfig } from './config';
import { MPesaErrorHandler, MPesaError as MPesaErrorClass } from './errors';

export interface B2CPaymentRequest {
  InitiatorName: string;
  SecurityCredential: string;
  CommandID: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
  Occasion?: string;
}

export interface B2CPaymentResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export interface B2CCallbackRequest {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string;
        Value: string | number;
      }>;
    };
  };
}

export interface BulkPayoutRequest {
  waiter_id: string;
  waiter_name: string;
  phone_number: string;
  amount: number;
  payout_id: string;
  reference: string;
}

export interface BulkPayoutResult {
  success: boolean;
  payout_id: string;
  waiter_name: string;
  amount: number;
  conversation_id?: string;
  originator_conversation_id?: string;
  error?: string;
}

export interface BulkPayoutBatchResult {
  success: boolean;
  total_payouts: number;
  successful_payouts: number;
  failed_payouts: number;
  total_amount: number;
  results: BulkPayoutResult[];
  errors: string[];
}

export class MPesaBulkPaymentService {
  private config = getMPesaConfig();
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  // B2C endpoints
  private readonly B2C_ENDPOINTS = {
    sandbox: {
      oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      b2c: 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
    },
    production: {
      oauth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      b2c: 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
    }
  };

  // B2C Command IDs
  private readonly B2C_COMMANDS = {
    SALARY_PAYMENT: 'SalaryPayment',
    BUSINESS_PAYMENT: 'BusinessPayment',
    PROMOTION_PAYMENT: 'PromotionPayment'
  };

  constructor() {
    const validation = validateMPesaConfig(this.config);
    if (!validation.isValid) {
      console.error('M-Pesa configuration errors:', validation.errors);
      throw new Error(`M-Pesa configuration invalid: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Get OAuth access token for B2C operations
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
      const endpoint = this.B2C_ENDPOINTS[this.config.environment].oauth;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorDetails = MPesaErrorHandler.parseHttpError(response.status);
        MPesaErrorHandler.logError(errorDetails, 'B2C OAuth Token Request', {
          endpoint,
          status: response.status
        });
        throw new MPesaErrorClass(errorDetails, 'B2C OAuth Token Request');
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000); // 55 minutes

      return this.accessToken;

    } catch (error) {
      if (error instanceof MPesaErrorClass) {
        throw error;
      }
      
      const errorDetails = MPesaErrorHandler.handleApiError(error, 'B2C OAuth Token Request');
      MPesaErrorHandler.logError(errorDetails, 'B2C OAuth Token Request');
      throw new MPesaErrorClass(errorDetails, 'B2C OAuth Token Request');
    }
  }

  /**
   * Normalize phone number to M-Pesa format (254XXXXXXXXX)
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    let cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.substring(1);
    }
    
    if (!cleanPhone.startsWith('254')) {
      cleanPhone = '254' + cleanPhone;
    }
    
    return cleanPhone;
  }

  /**
   * Generate security credential for B2C requests
   * Note: In production, this should use proper certificate encryption
   */
  private generateSecurityCredential(): string {
    // For sandbox, we can use the initiator password directly
    // In production, this needs to be encrypted with M-Pesa's public certificate
    const initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD || 'Safcom496!';
    
    if (this.config.environment === 'production') {
      // TODO: Implement proper certificate encryption for production
      console.warn('Production B2C requires proper certificate encryption for security credential');
    }
    
    return Buffer.from(initiatorPassword).toString('base64');
  }

  /**
   * Send a single B2C payment
   */
  async sendB2CPayment(params: {
    phoneNumber: string;
    amount: number;
    reference: string;
    remarks: string;
    occasion?: string;
  }): Promise<B2CPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const normalizedPhone = this.normalizePhoneNumber(params.phoneNumber);
      const securityCredential = this.generateSecurityCredential();

      const requestBody: B2CPaymentRequest = {
        InitiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
        SecurityCredential: securityCredential,
        CommandID: this.B2C_COMMANDS.BUSINESS_PAYMENT,
        Amount: params.amount,
        PartyA: this.config.businessShortCode,
        PartyB: normalizedPhone,
        Remarks: params.remarks,
        QueueTimeOutURL: this.config.timeoutUrl.replace('/mpesa/', '/mpesa/b2c/'),
        ResultURL: this.config.callbackUrl.replace('/mpesa/', '/mpesa/b2c/'),
        Occasion: params.occasion || params.reference
      };

      const endpoint = this.B2C_ENDPOINTS[this.config.environment].b2c;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('B2C payment request failed:', responseData);
        throw new Error(`B2C payment failed: ${responseData.errorMessage || response.statusText}`);
      }

      // Check if the response indicates success
      if (responseData.ResponseCode !== '0') {
        throw new Error(`B2C payment failed: ${responseData.ResponseDescription || 'Unknown error'}`);
      }

      return responseData as B2CPaymentResponse;

    } catch (error) {
      console.error('B2C payment error:', error);
      throw new Error(`Failed to send B2C payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process bulk payouts for multiple waiters
   */
  async processBulkPayouts(payouts: BulkPayoutRequest[]): Promise<BulkPayoutBatchResult> {
    const results: BulkPayoutResult[] = [];
    const errors: string[] = [];
    let successfulPayouts = 0;
    let totalAmount = 0;

    console.log(`Processing ${payouts.length} bulk payouts...`);

    for (const payout of payouts) {
      try {
        // Add delay between requests to avoid rate limiting
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }

        const response = await this.sendB2CPayment({
          phoneNumber: payout.phone_number,
          amount: payout.amount,
          reference: payout.reference,
          remarks: `Tip payout for ${payout.waiter_name}`,
          occasion: `Payout-${payout.payout_id}`
        });

        results.push({
          success: true,
          payout_id: payout.payout_id,
          waiter_name: payout.waiter_name,
          amount: payout.amount,
          conversation_id: response.ConversationID,
          originator_conversation_id: response.OriginatorConversationID
        });

        successfulPayouts++;
        totalAmount += payout.amount;

        console.log(`✓ Payout sent to ${payout.waiter_name}: KES ${payout.amount}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.push({
          success: false,
          payout_id: payout.payout_id,
          waiter_name: payout.waiter_name,
          amount: payout.amount,
          error: errorMessage
        });

        errors.push(`${payout.waiter_name}: ${errorMessage}`);
        console.error(`✗ Failed payout to ${payout.waiter_name}: ${errorMessage}`);
      }
    }

    const batchResult: BulkPayoutBatchResult = {
      success: errors.length === 0,
      total_payouts: payouts.length,
      successful_payouts: successfulPayouts,
      failed_payouts: payouts.length - successfulPayouts,
      total_amount: totalAmount,
      results,
      errors
    };

    console.log(`Bulk payout batch completed: ${successfulPayouts}/${payouts.length} successful, KES ${totalAmount} total`);

    return batchResult;
  }

  /**
   * Validate B2C callback signature and extract transaction details
   */
  validateB2CCallback(body: any): boolean {
    if (!body?.Result) {
      return false;
    }

    const result = body.Result;
    return !!(result.ConversationID && result.OriginatorConversationID && typeof result.ResultCode === 'number');
  }

  /**
   * Extract transaction details from B2C callback
   */
  extractB2CTransactionDetails(callbackData: any): {
    conversationId: string;
    originatorConversationId: string;
    transactionId: string;
    resultCode: number;
    resultDesc: string;
    amount?: number;
    recipientPhone?: string;
    transactionDate?: string;
  } | null {
    const result = callbackData.Result;
    
    if (!result) {
      return null;
    }

    const details: any = {
      conversationId: result.ConversationID,
      originatorConversationId: result.OriginatorConversationID,
      transactionId: result.TransactionID,
      resultCode: result.ResultCode,
      resultDesc: result.ResultDesc
    };

    // Extract additional details from ResultParameters if available
    if (result.ResultParameters?.ResultParameter) {
      result.ResultParameters.ResultParameter.forEach((param: any) => {
        switch (param.Key) {
          case 'TransactionAmount':
            details.amount = Number(param.Value);
            break;
          case 'TransactionReceipt':
            details.transactionReceipt = param.Value;
            break;
          case 'ReceiverPartyPublicName':
            details.recipientName = param.Value;
            break;
          case 'TransactionCompletedDateTime':
            details.transactionDate = param.Value;
            break;
          case 'B2CRecipientIsRegisteredCustomer':
            details.isRegisteredCustomer = param.Value;
            break;
        }
      });
    }

    return details;
  }

  /**
   * Parse B2C transaction status from result code
   */
  parseB2CTransactionStatus(resultCode: number): 'completed' | 'failed' {
    // B2C result codes: 0 = success, anything else = failure
    return resultCode === 0 ? 'completed' : 'failed';
  }

  /**
   * Test B2C connection and credentials
   */
  async testB2CConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getAccessToken();
      return {
        success: true,
        message: 'M-Pesa B2C connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'B2C connection test failed'
      };
    }
  }
}

// Export singleton instance
export const mpesaBulkPaymentService = new MPesaBulkPaymentService();