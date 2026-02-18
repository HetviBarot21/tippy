/**
 * Pesawise Bank Transfer Client
 * 
 * Integration with Pesawise API for bank transfers in Kenya
 * Documentation: https://docs.pesawise.com
 */

export interface PesawiseConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  callbackUrl?: string;
}

export interface PesawiseTransferRequest {
  account_number: string;
  account_name: string;
  bank_code: string;
  amount: number;
  reference: string;
  narration: string;
  currency?: string;
}

export interface PesawiseTransferResponse {
  success: boolean;
  transaction_id?: string;
  reference?: string;
  status?: string;
  message: string;
  data?: any;
}

export interface PesawiseAccountValidationRequest {
  account_number: string;
  bank_code: string;
}

export interface PesawiseAccountValidationResponse {
  success: boolean;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  message: string;
}

export class PesawiseClient {
  private config: PesawiseConfig;
  private authToken?: string;
  private tokenExpiry?: number;

  constructor(config: PesawiseConfig) {
    this.config = config;
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.config.apiKey,
          api_secret: this.config.apiSecret,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const data = await response.json();
      this.authToken = data.access_token;
      // Set expiry to 50 minutes (tokens typically last 1 hour)
      this.tokenExpiry = Date.now() + 50 * 60 * 1000;

      return this.authToken!;
    } catch (error) {
      console.error('Pesawise authentication error:', error);
      throw new Error(`Failed to authenticate with Pesawise: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initiate a bank transfer
   */
  async initiateTransfer(request: PesawiseTransferRequest): Promise<PesawiseTransferResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.config.baseUrl}/transfers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_number: request.account_number,
          account_name: request.account_name,
          bank_code: request.bank_code,
          amount: request.amount,
          reference: request.reference,
          narration: request.narration,
          currency: request.currency || 'KES',
          callback_url: this.config.callbackUrl,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        return {
          success: true,
          transaction_id: data.data.transaction_id,
          reference: data.data.reference,
          status: data.data.status,
          message: data.message || 'Transfer initiated successfully',
          data: data.data,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Transfer initiation failed',
          data,
        };
      }
    } catch (error) {
      console.error('Pesawise transfer error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  /**
   * Query transfer status
   */
  async queryTransferStatus(transactionId: string): Promise<PesawiseTransferResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.config.baseUrl}/transfers/${transactionId}`, {
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
          transaction_id: data.data.transaction_id,
          reference: data.data.reference,
          status: data.data.status,
          message: data.message || 'Status retrieved successfully',
          data: data.data,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to retrieve status',
          data,
        };
      }
    } catch (error) {
      console.error('Pesawise status query error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Status query failed',
      };
    }
  }

  /**
   * Validate bank account
   */
  async validateAccount(request: PesawiseAccountValidationRequest): Promise<PesawiseAccountValidationResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.config.baseUrl}/accounts/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_number: request.account_number,
          bank_code: request.bank_code,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        return {
          success: true,
          account_name: data.data.account_name,
          account_number: data.data.account_number,
          bank_name: data.data.bank_name,
          message: data.message || 'Account validated successfully',
        };
      } else {
        return {
          success: false,
          message: data.message || 'Account validation failed',
        };
      }
    } catch (error) {
      console.error('Pesawise account validation error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Get list of supported banks
   */
  async getSupportedBanks(): Promise<{
    success: boolean;
    banks?: Array<{ code: string; name: string }>;
    message: string;
  }> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.config.baseUrl}/banks`, {
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
          banks: data.data.banks,
          message: 'Banks retrieved successfully',
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to retrieve banks',
        };
      }
    } catch (error) {
      console.error('Pesawise get banks error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get banks',
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
    baseUrl: process.env.PESAWISE_BASE_URL || 'https://api.pesawise.com/v1',
    callbackUrl: process.env.PESAWISE_CALLBACK_URL,
  };

  if (!config.apiKey || !config.apiSecret) {
    throw new Error('Pesawise API credentials not configured');
  }

  return new PesawiseClient(config);
}
