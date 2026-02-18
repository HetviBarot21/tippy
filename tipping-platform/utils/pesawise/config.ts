/**
 * PesaWise API Configuration
 * Handles PesaWise API credentials and environment setup
 */

export interface PesaWiseConfig {
  apiKey: string;
  secretKey: string;
  balanceId: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}

export const pesaWiseConfig: PesaWiseConfig = {
  apiKey: process.env.PESAWISE_API_KEY || '',
  secretKey: process.env.PESAWISE_SECRET_KEY || '',
  balanceId: process.env.PESAWISE_BALANCE_ID || '',
  environment: (process.env.PESAWISE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  baseUrl: process.env.PESAWISE_API_URL || 'https://api.pesawise.com'
};

// Validation function to ensure all required config is present
export function validatePesaWiseConfig(): void {
  const requiredFields: (keyof PesaWiseConfig)[] = ['apiKey', 'secretKey', 'balanceId'];
  
  for (const field of requiredFields) {
    if (!pesaWiseConfig[field]) {
      throw new Error(`Missing required PesaWise configuration: ${field}`);
    }
  }
}

// Default callback URLs
export const pesaWiseCallbacks = {
  callbackUrl: process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/pesawise/callback`
    : 'http://localhost:3000/api/webhooks/pesawise/callback',
  timeoutUrl: process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/pesawise/timeout`
    : 'http://localhost:3000/api/webhooks/pesawise/timeout'
};