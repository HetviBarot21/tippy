/**
 * M-Pesa Daraja API Client
 * 
 * This module provides the main client for interacting with M-Pesa Daraja API
 * including authentication, STK Push, and payment status queries.
 */

import {
  getMpesaConfig,
  getMpesaUrls,
  generateTimestamp,
  generatePassword,
  formatPhoneNumber,
  type MpesaCredentials,
  type MpesaSTKPushRequest,
  type MpesaSTKPushResponse,
  type MpesaB2CRequest,
  type MpesaB2CResponse
} from './config';

export class MpesaClient {
  private config = getMpesaConfig();
  private urls = getMpesaUrls(this.config.environment);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  /**
   * Get access token from M-Pesa API
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    try {
      const response = await fetch(this.urls.auth, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`M-Pesa auth failed: ${response.status} ${response.statusText}`);
      }

      const data: MpesaCredentials = await response.json();
      
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (parseInt(data.expires_in) - 300) * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('M-Pesa authentication error:', error);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }

  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush(params: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<MpesaSTKPushResponse> {
    const accessToken = await this.getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(
      this.config.businessShortCode,
      this.config.passkey,
      timestamp
    );

    const formattedPhone = formatPhoneNumber(params.phoneNumber);

    const requestData: MpesaSTKPushRequest = {
      BusinessShortCode: this.config.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: params.amount,
      PartyA: formattedPhone,
      PartyB: this.config.businessShortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: this.config.callbackUrl,
      AccountReference: params.accountReference,
      TransactionDesc: params.transactionDesc
    };

    try {
      const response = await fetch(this.urls.stkPush, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('M-Pesa STK Push error response:', errorText);
        throw new Error(`M-Pesa STK Push failed: ${response.status} ${response.statusText}`);
      }

      const data: MpesaSTKPushResponse = await response.json();
      
      // Check if the response indicates success
      if (data.ResponseCode !== '0') {
        throw new Error(`M-Pesa STK Push failed: ${data.ResponseDescription}`);
      }

      return data;
    } catch (error) {
      console.error('M-Pesa STK Push error:', error);
      throw error;
    }
  }

  /**
   * Query STK Push payment status
   */
  async querySTKPushStatus(checkoutRequestId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(
      this.config.businessShortCode,
      this.config.passkey,
      timestamp
    );

    const requestData = {
      BusinessShortCode: this.config.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    try {
      const response = await fetch(this.urls.stkQuery, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`M-Pesa query failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('M-Pesa query error:', error);
      throw error;
    }
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    try {
      formatPhoneNumber(phoneNumber);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initiate B2C payment (Business to Customer)
   * Used for payout transfers to waiters
   */
  async initiateB2CPayment(params: {
    phoneNumber: string;
    amount: number;
    remarks: string;
    occasion?: string;
  }): Promise<MpesaB2CResponse> {
    const accessToken = await this.getAccessToken();
    const formattedPhone = formatPhoneNumber(params.phoneNumber);

    if (!this.config.b2cInitiatorName || !this.config.b2cSecurityCredential) {
      throw new Error('B2C configuration missing: initiator name or security credential');
    }

    const requestData: MpesaB2CRequest = {
      InitiatorName: this.config.b2cInitiatorName,
      SecurityCredential: this.config.b2cSecurityCredential,
      CommandID: 'BusinessPayment', // For normal business payments
      Amount: params.amount,
      PartyA: this.config.b2cShortCode || this.config.businessShortCode,
      PartyB: formattedPhone,
      Remarks: params.remarks,
      QueueTimeOutURL: this.config.timeoutUrl,
      ResultURL: `${this.config.callbackUrl}/b2c`,
      Occasion: params.occasion || 'Payout'
    };

    try {
      const response = await fetch(this.urls.b2c, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('M-Pesa B2C error response:', errorText);
        throw new Error(`M-Pesa B2C failed: ${response.status} ${response.statusText}`);
      }

      const data: MpesaB2CResponse = await response.json();
      
      // Check if the response indicates success
      if (data.ResponseCode !== '0') {
        throw new Error(`M-Pesa B2C failed: ${data.ResponseDescription}`);
      }

      return data;
    } catch (error) {
      console.error('M-Pesa B2C error:', error);
      throw error;
    }
  }

  /**
   * Process bulk B2C payments
   * Used for processing multiple waiter payouts
   */
  async processBulkB2CPayments(payments: Array<{
    phoneNumber: string;
    amount: number;
    remarks: string;
    reference: string;
  }>): Promise<Array<{
    reference: string;
    success: boolean;
    conversationId?: string;
    error?: string;
  }>> {
    const results = [];

    for (const payment of payments) {
      try {
        const response = await this.initiateB2CPayment({
          phoneNumber: payment.phoneNumber,
          amount: payment.amount,
          remarks: payment.remarks,
          occasion: 'Waiter Payout'
        });

        results.push({
          reference: payment.reference,
          success: true,
          conversationId: response.ConversationID
        });

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`B2C payment failed for ${payment.reference}:`, error);
        results.push({
          reference: payment.reference,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const mpesaClient = new MpesaClient();