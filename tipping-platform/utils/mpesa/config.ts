/**
 * M-Pesa Daraja API configuration and constants
 */

export interface MPesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  callbackUrl: string;
  timeoutUrl: string;
  environment: 'sandbox' | 'production';
}

export const MPESA_ENDPOINTS = {
  sandbox: {
    oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkPush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    stkQuery: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
  },
  production: {
    oauth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkPush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    stkQuery: 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
  }
};

export const MPESA_TRANSACTION_TYPES = {
  CUSTOMER_PAYBILL_ONLINE: 'CustomerPayBillOnline',
  CUSTOMER_BUY_GOODS_ONLINE: 'CustomerBuyGoodsOnline'
};

/**
 * Get M-Pesa configuration from environment variables
 */
export function getMPesaConfig(): MPesaConfig {
  const environment = (process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
  
  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '',
    passkey: process.env.MPESA_PASSKEY || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mpesa/callback`,
    timeoutUrl: process.env.MPESA_TIMEOUT_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mpesa/timeout`,
    environment
  };
}

/**
 * Validate M-Pesa configuration
 */
export function validateMPesaConfig(config: MPesaConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.consumerKey) {
    errors.push('MPESA_CONSUMER_KEY is required');
  }

  if (!config.consumerSecret) {
    errors.push('MPESA_CONSUMER_SECRET is required');
  }

  if (!config.businessShortCode) {
    errors.push('MPESA_BUSINESS_SHORT_CODE is required');
  }

  if (!config.passkey) {
    errors.push('MPESA_PASSKEY is required');
  }

  if (!config.callbackUrl) {
    errors.push('MPESA_CALLBACK_URL is required');
  }

  if (!config.timeoutUrl) {
    errors.push('MPESA_TIMEOUT_URL is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}