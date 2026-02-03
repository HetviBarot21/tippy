/**
 * M-Pesa Daraja API service for handling STK Push payments
 */

import { getMPesaConfig, validateMPesaConfig, MPESA_ENDPOINTS, MPESA_TRANSACTION_TYPES } from './config';
import { 
  MPesaOAuthResponse, 
  STKPushRequest, 
  STKPushResponse, 
  STKPushQueryRequest, 
  STKPushQueryResponse,
  MPesaError,
  MPesaTransactionStatus
} from './types';
import { MPesaErrorHandler, MPesaError as MPesaErrorClass } from './errors';

export class MPesaService {
  private config = getMPesaConfig();
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    // Validate configuration on initialization
    const validation = validateMPesaConfig(this.config);
    if (!validation.isValid) {
      console.error('M-Pesa configuration errors:', validation.errors);
      throw new Error(`M-Pesa configuration invalid: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Get OAuth access token from M-Pesa API with error handling
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
      const endpoint = MPESA_ENDPOINTS[this.config.environment].oauth;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorDetails = MPesaErrorHandler.parseHttpError(response.status);
        MPesaErrorHandler.logError(errorDetails, 'OAuth Token Request', {
          endpoint,
          status: response.status
        });
        throw new MPesaErrorClass(errorDetails, 'OAuth Token Request');
      }

      const data: MPesaOAuthResponse = await response.json();
      
      this.accessToken = data.access_token;
      // Token expires in 1 hour, cache for 55 minutes to be safe
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

      return this.accessToken;

    } catch (error) {
      if (error instanceof MPesaErrorClass) {
        throw error;
      }
      
      const errorDetails = MPesaErrorHandler.handleApiError(error, 'OAuth Token Request');
      MPesaErrorHandler.logError(errorDetails, 'OAuth Token Request');
      throw new MPesaErrorClass(errorDetails, 'OAuth Token Request');
    }
  }

  /**
   * Generate password for STK Push request
   */
  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${this.config.businessShortCode}${this.config.passkey}${timestamp}`).toString('base64');
    
    return { password, timestamp };
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
   * Initiate STK Push payment request
   */
  async initiateSTKPush(params: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<STKPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();
      const normalizedPhone = this.normalizePhoneNumber(params.phoneNumber);

      const requestBody: STKPushRequest = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: MPESA_TRANSACTION_TYPES.CUSTOMER_PAYBILL_ONLINE,
        Amount: params.amount,
        PartyA: normalizedPhone,
        PartyB: this.config.businessShortCode,
        PhoneNumber: normalizedPhone,
        CallBackURL: this.config.callbackUrl,
        AccountReference: params.accountReference,
        TransactionDesc: params.transactionDesc
      };

      const endpoint = MPESA_ENDPOINTS[this.config.environment].stkPush;

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
        console.error('STK Push request failed:', responseData);
        throw new Error(`STK Push failed: ${responseData.errorMessage || response.statusText}`);
      }

      // Check if the response indicates success
      if (responseData.ResponseCode !== '0') {
        throw new Error(`STK Push failed: ${responseData.ResponseDescription || 'Unknown error'}`);
      }

      return responseData as STKPushResponse;

    } catch (error) {
      console.error('STK Push error:', error);
      throw new Error(`Failed to initiate STK Push: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query STK Push transaction status
   */
  async querySTKPushStatus(checkoutRequestId: string): Promise<STKPushQueryResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const requestBody: STKPushQueryRequest = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const endpoint = MPESA_ENDPOINTS[this.config.environment].stkQuery;

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
        console.error('STK Push query failed:', responseData);
        throw new Error(`STK Push query failed: ${responseData.errorMessage || response.statusText}`);
      }

      return responseData as STKPushQueryResponse;

    } catch (error) {
      console.error('STK Push query error:', error);
      throw new Error(`Failed to query STK Push status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse M-Pesa transaction status from result code
   */
  parseTransactionStatus(resultCode: number): MPesaTransactionStatus {
    switch (resultCode) {
      case 0:
        return 'completed';
      case 1032:
        return 'cancelled';
      case 1037:
        return 'timeout';
      case 1:
        return 'failed';
      default:
        return 'failed';
    }
  }

  /**
   * Validate M-Pesa callback signature (basic validation)
   */
  validateCallback(body: any): boolean {
    // Basic validation - check if required fields exist
    if (!body?.Body?.stkCallback) {
      return false;
    }

    const callback = body.Body.stkCallback;
    return !!(callback.MerchantRequestID && callback.CheckoutRequestID && typeof callback.ResultCode === 'number');
  }

  /**
   * Extract transaction details from successful callback
   */
  extractTransactionDetails(callbackData: any): {
    amount: number;
    mpesaReceiptNumber: string;
    transactionDate: string;
    phoneNumber: string;
  } | null {
    const callback = callbackData.Body?.stkCallback;
    
    if (!callback?.CallbackMetadata?.Item) {
      return null;
    }

    const items = callback.CallbackMetadata.Item;
    const details: any = {};

    items.forEach((item: any) => {
      switch (item.Name) {
        case 'Amount':
          details.amount = Number(item.Value);
          break;
        case 'MpesaReceiptNumber':
          details.mpesaReceiptNumber = item.Value;
          break;
        case 'TransactionDate':
          details.transactionDate = item.Value;
          break;
        case 'PhoneNumber':
          details.phoneNumber = item.Value;
          break;
      }
    });

    // Validate that we have all required details
    if (details.amount && details.mpesaReceiptNumber && details.transactionDate && details.phoneNumber) {
      return details;
    }

    return null;
  }

  /**
   * Test M-Pesa connection and credentials
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getAccessToken();
      return {
        success: true,
        message: 'M-Pesa connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
export const mpesaService = new MPesaService();