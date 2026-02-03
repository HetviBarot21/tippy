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
  type MpesaSTKPushResponse
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
}

// Export singleton instance
export const mpesaClient = new MpesaClient();