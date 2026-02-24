/**
 * PesaWise API Service
 * Handles all PesaWise API interactions for M-Pesa payments
 */

import crypto from 'crypto';
import { pesaWiseConfig, validatePesaWiseConfig, pesaWiseCallbacks, isTestMode } from './config';
import {
  PesaWiseSTKPushRequest,
  PesaWiseSTKPushResponse,
  PesaWiseStatusQueryRequest,
  PesaWiseStatusQueryResponse,
  PesaWiseCallbackData,
  PesaWiseBalanceResponse,
  PesaWiseTransactionHistoryResponse,
  PesaWiseErrorResponse
} from './types';

export class PesaWiseService {
  private config = pesaWiseConfig;
  private testMode: boolean;

  constructor() {
    validatePesaWiseConfig();
    this.testMode = isTestMode();
    
    if (this.testMode) {
      console.log('🧪 PesaWise Service running in TEST MODE - No real payments will be processed');
    }
  }

  /**
   * Generate authentication headers for PesaWise API
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
   * Make authenticated API request to PesaWise
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    data?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = this.getHeaders();

    console.log(`PesaWise API Request: ${method} ${url}`, {
      headers: { ...headers, 'api-key': '[REDACTED]', 'api-secret': '[REDACTED]' },
      data
    });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      const responseData = await response.json();

      console.log(`PesaWise API Response: ${response.status}`, responseData);

      if (!response.ok) {
        throw new Error(`PesaWise API Error: ${response.status} - ${responseData.message || responseData.detail || 'Unknown error'}`);
      }

      return responseData;
    } catch (error) {
      console.error('PesaWise API Request Failed:', error);
      throw error;
    }
  }

  /**
   * Normalize phone number to PesaWise format (254XXXXXXXXX)
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
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
   * Initiate STK Push payment
   */
  async initiateSTKPush(request: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<PesaWiseSTKPushResponse> {
    try {
      // TEST MODE: Return mock success response
      if (this.testMode) {
        console.log('🧪 TEST MODE: Simulating STK Push', request);
        return {
          success: true,
          message: 'TEST MODE: STK Push initiated successfully',
          checkout_request_id: `TEST_${Date.now()}`,
          merchant_request_id: `MERCHANT_TEST_${Date.now()}`,
          response_code: '0',
          response_description: 'Success. Request accepted for processing',
          customer_message: 'Success. Request accepted for processing'
        };
      }

      const normalizedPhone = this.normalizePhoneNumber(request.phoneNumber);

      const payload: PesaWiseSTKPushRequest = {
        balanceId: this.config.balanceId,
        amount: request.amount,
        phoneNumber: normalizedPhone,
        reference: request.accountReference
      };

      const response = await this.makeRequest<PesaWiseSTKPushResponse>(
        '/api/payments/stk-push',
        'POST',
        payload
      );

      return response;
    } catch (error) {
      console.error('STK Push initiation failed:', error);
      return {
        success: false,
        message: 'Failed to initiate STK Push',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create payment link for card/multiple payment methods
   */
  async createPaymentLink(request: {
    amount: number;
    accountReference: string;
    transactionDesc: string;
    payeeName: string;
  }): Promise<{
    success: boolean;
    payment_link?: string;
    payment_link_id?: string;
    message?: string;
    error?: string;
  }> {
    try {
      // TEST MODE: Return mock payment link
      if (this.testMode) {
        console.log('🧪 TEST MODE: Simulating Payment Link', request);
        // In test mode, return a special URL that the frontend can detect
        const testLink = `TEST_MODE_CARD_PAYMENT_${Date.now()}`;
        return {
          success: true,
          payment_link: testLink,
          payment_link_id: `TEST_LINK_${Date.now()}`,
          message: 'TEST MODE: Card payment simulated successfully'
        };
      }

      const payload = {
        balanceId: this.config.balanceId,
        amount: request.amount,
        reference: request.accountReference,
        description: request.transactionDesc,
        payeeName: request.payeeName,
        callbackUrl: pesaWiseCallbacks.callbackUrl
      };

      const response = await this.makeRequest<any>(
        '/api/payment-links',
        'POST',
        payload
      );

      return {
        success: true,
        payment_link: response.payment_link || response.link,
        payment_link_id: response.id || response.link_id,
        message: 'Payment link created successfully'
      };
    } catch (error) {
      console.error('Payment link creation failed:', error);
      return {
        success: false,
        message: 'Failed to create payment link',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Query STK Push payment status
   */
  async querySTKPushStatus(checkoutRequestId: string): Promise<PesaWiseStatusQueryResponse> {
    try {
      const payload: PesaWiseStatusQueryRequest = {
        checkout_request_id: checkoutRequestId
      };

      const response = await this.makeRequest<PesaWiseStatusQueryResponse>(
        '/payments/status',
        'POST',
        payload
      );

      return response;
    } catch (error) {
      console.error('STK Push status query failed:', error);
      return {
        success: false,
        message: 'Failed to query payment status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<PesaWiseBalanceResponse> {
    try {
      const response = await this.makeRequest<PesaWiseBalanceResponse>(
        '/api/v1/account/balance',
        'GET'
      );

      return response;
    } catch (error) {
      console.error('Balance query failed:', error);
      return {
        success: false,
        message: 'Failed to get account balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(
    balanceId?: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<PesaWiseTransactionHistoryResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      if (balanceId) {
        params.append('balanceId', balanceId);
      }

      const response = await this.makeRequest<PesaWiseTransactionHistoryResponse>(
        `/api/payments/transactions?${params.toString()}`,
        'GET'
      );

      return response;
    } catch (error) {
      console.error('Wallet transactions query failed:', error);
      return {
        success: false,
        message: 'Failed to get wallet transactions',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transaction history (legacy method)
   */
  async getTransactionHistory(
    page: number = 1,
    perPage: number = 50,
    startDate?: string,
    endDate?: string
  ): Promise<PesaWiseTransactionHistoryResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await this.makeRequest<PesaWiseTransactionHistoryResponse>(
        `/api/v1/transactions?${params.toString()}`,
        'GET'
      );

      return response;
    } catch (error) {
      console.error('Transaction history query failed:', error);
      return {
        success: false,
        message: 'Failed to get transaction history',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate webhook callback signature
   */
  validateCallbackSignature(payload: string, signature: string, timestamp: string): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, timestamp);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Signature validation failed:', error);
      return false;
    }
  }

  /**
   * Parse transaction status from result code
   */
  parseTransactionStatus(resultCode: string): 'completed' | 'failed' | 'cancelled' | 'timeout' | 'processing' {
    switch (resultCode) {
      case '0':
        return 'completed';
      case '1':
        return 'failed';
      case '1032':
        return 'cancelled';
      case '1037':
        return 'timeout';
      case '1001':
        return 'failed'; // Insufficient funds
      case '2001':
        return 'failed'; // Invalid phone number
      default:
        return 'processing';
    }
  }

  /**
   * Extract transaction details from callback data
   */
  extractTransactionDetails(callbackData: PesaWiseCallbackData): {
    amount: number;
    mpesaReceiptNumber: string;
    transactionDate: string;
    phoneNumber: string;
  } | null {
    if (
      callbackData.result_code === '0' &&
      callbackData.amount &&
      callbackData.mpesa_receipt_number &&
      callbackData.transaction_date &&
      callbackData.phone_number
    ) {
      return {
        amount: callbackData.amount,
        mpesaReceiptNumber: callbackData.mpesa_receipt_number,
        transactionDate: callbackData.transaction_date,
        phoneNumber: callbackData.phone_number
      };
    }
    return null;
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.getAccountBalance();
      
      if (response.success) {
        return {
          success: true,
          message: 'PesaWise API connection successful'
        };
      } else {
        return {
          success: false,
          message: response.error || 'API connection failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
export const pesaWiseService = new PesaWiseService();