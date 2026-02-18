/**
 * Pesawise Payment Client
 * 
 * Handles M-Pesa STK Push payments, card payments, and transaction management via Pesawise API
 * Base URL: https://api.pesawise.xyz (test environment)
 */

export interface PesawiseConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  balanceId: string;
  callbackUrl?: string;
  redirectUrl?: string;
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  balanceId: string;
  reference: string;
  description?: string;
}

export interface STKPushResponse {
  success: boolean;
  transactionId?: string;
  checkoutRequestId?: string;
  message: string;
  data?: any;
}

export interface PaymentLinkRequest {
  amount: number;
  balanceId: string;
  reference: string;
  description: string;
  payeeName: string;
  redirectUrl?: string;
  callbackUrl?: string;
  isFlexibleAmount?: boolean;
  isRecurring?: boolean;
}

export interface PaymentLinkResponse {
  success: boolean;
  paymentLink?: string;
  linkId?: string;
  message: string;
  data?: any;
}

export interface TransactionQuery {
  balanceId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  phoneNumber: string;
  reference: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

export class PesawiseClient {
  private config: PesawiseConfig;
  private authToken?: string;
  private tokenExpiry?: number;

  constructor(config: PesawiseConfig) {
    this.config = config;
  }

  /**
   * Get OAuth2 authentication token
   */
  private async getAuthToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    try {
      // Create Basic Auth header
      const credentials = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

      const response = await fetch(`${this.config.baseUrl}/oauth2/v1/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Authentication failed' }));
        throw new Error(error.message || 'Authentication failed');
      }

      const data = await response.json();
      this.authToken = data.access_token;
      // Set expiry to 4 minutes (tokens typically last 5 minutes)
      this.tokenExpiry = Date.now() + 4 * 60 * 1000;

      return this.authToken!;
    } catch (error) {
      console.error('Pesawise authentication error:', error);
      throw new Error(`Failed to authenticate with Pesawise: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initiate M-Pesa STK Push payment
   */
  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      const token = await this.getAuthToken();

      // Format phone number (ensure it starts with 254)
      let phoneNumber = request.phoneNumber.replace(/\D/g, '');
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1);
      } else if (phoneNumber.startsWith('7') || phoneNumber.startsWith('1')) {
        phoneNumber = '254' + phoneNumber;
      }

      const response = await fetch(`${this.config.baseUrl}/api/payments/stk-push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          amount: Math.round(request.amount), // Ensure integer
          balanceId: request.balanceId,
          reference: request.reference,
          description: request.description || 'Payment',
          callbackUrl: this.config.callbackUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          transactionId: data.transactionId || data.id,
          checkoutRequestId: data.checkoutRequestId,
          message: data.message || 'STK Push initiated successfully',
          data,
        };
      } else {
        return {
          success: false,
          message: data.message || 'STK Push initiation failed',
          data,
        };
      }
    } catch (error) {
      console.error('Pesawise STK Push error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'STK Push failed',
      };
    }
  }

  /**
   * Create payment link for card/multiple payment methods
   * Supports M-Pesa, Card, Bank Transfer, and Pesawise Transfer
   */
  async createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.config.baseUrl}/api/payment-links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          balanceId: request.balanceId,
          payeeName: request.payeeName,
          description: request.description,
          reference: request.reference,
          amount: request.isFlexibleAmount ? null : Math.round(request.amount),
          isFlexibleAmount: request.isFlexibleAmount || false,
          isRecurring: request.isRecurring || false,
          redirectUrl: request.redirectUrl || this.config.redirectUrl,
          callbackUrl: request.callbackUrl || this.config.callbackUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          paymentLink: data.paymentLink || data.link || data.url,
          linkId: data.id || data.linkId,
          message: data.message || 'Payment link created successfully',
          data,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Payment link creation failed',
          data,
        };
      }
    } catch (error) {
      console.error('Pesawise create payment link error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment link creation failed',
      };
    }
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(query: TransactionQuery): Promise<{
    success: boolean;
    transactions?: Transaction[];
    total?: number;
    message: string;
  }> {
    try {
      const token = await this.getAuthToken();

      // Build query parameters
      const params = new URLSearchParams({
        balanceId: query.balanceId,
        ...(query.startDate && { startDate: query.startDate }),
        ...(query.endDate && { endDate: query.endDate }),
        ...(query.page && { page: query.page.toString() }),
        ...(query.limit && { limit: query.limit.toString() }),
      });

      const response = await fetch(`${this.config.baseUrl}/api/payments/transactions?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          transactions: data.transactions || data.data,
          total: data.total || data.count,
          message: 'Transactions retrieved successfully',
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to retrieve transactions',
        };
      }
    } catch (error) {
      console.error('Pesawise get transactions error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get transactions',
      };
    }
  }

  /**
   * Query transaction status by ID
   */
  async queryTransactionStatus(transactionId: string): Promise<{
    success: boolean;
    status?: string;
    transaction?: Transaction;
    message: string;
  }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.config.baseUrl}/api/payments/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          status: data.status,
          transaction: data.transaction || data.data,
          message: 'Transaction status retrieved successfully',
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to retrieve transaction status',
        };
      }
    } catch (error) {
      console.error('Pesawise query transaction error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to query transaction',
      };
    }
  }

  /**
   * Get balance information
   */
  async getBalance(balanceId: string): Promise<{
    success: boolean;
    balance?: number;
    currency?: string;
    message: string;
  }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.config.baseUrl}/api/balances/${balanceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          balance: data.balance || data.amount,
          currency: data.currency || 'KES',
          message: 'Balance retrieved successfully',
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to retrieve balance',
        };
      }
    } catch (error) {
      console.error('Pesawise get balance error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get balance',
      };
    }
  }
}

/**
 * Create Pesawise client instance
 */
export function createPesawiseClient(): PesawiseClient {
  const config: PesawiseConfig = {
    apiKey: process.env.PESAWISE_API_KEY || '',
    apiSecret: process.env.PESAWISE_API_SECRET || '',
    baseUrl: process.env.PESAWISE_BASE_URL || 'https://api.pesawise.xyz',
    balanceId: process.env.PESAWISE_BALANCE_ID || '',
    callbackUrl: process.env.PESAWISE_CALLBACK_URL,
    redirectUrl: process.env.PESAWISE_REDIRECT_URL || process.env.NEXT_PUBLIC_SITE_URL,
  };

  if (!config.apiKey || !config.apiSecret) {
    throw new Error('Pesawise API credentials not configured');
  }

  if (!config.balanceId) {
    throw new Error('Pesawise Balance ID not configured');
  }

  return new PesawiseClient(config);
}
