/**
 * M-Pesa Daraja API Configuration
 * 
 * This module handles M-Pesa API configuration and authentication
 * for the Tippy tipping platform.
 */

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
  timeoutUrl: string;
  b2cShortCode?: string;
  b2cInitiatorName?: string;
  b2cSecurityCredential?: string;
}

export interface MpesaCredentials {
  access_token: string;
  expires_in: string;
}

export interface MpesaSTKPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

export interface MpesaSTKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaCallbackData {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: Array<{
      Name: string;
      Value: string | number;
    }>;
  };
}

export interface MpesaB2CRequest {
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

export interface MpesaB2CResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// M-Pesa API URLs
const MPESA_URLS = {
  sandbox: {
    auth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkPush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    stkQuery: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
    b2c: 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
  },
  production: {
    auth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkPush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    stkQuery: 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
    b2c: 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
  }
};

export function getMpesaConfig(): MpesaConfig {
  const environment = (process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
  
  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '',
    passkey: process.env.MPESA_PASSKEY || '',
    environment,
    callbackUrl: process.env.MPESA_CALLBACK_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mpesa`,
    timeoutUrl: process.env.MPESA_TIMEOUT_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mpesa/timeout`,
    b2cShortCode: process.env.MPESA_B2C_SHORT_CODE || process.env.MPESA_BUSINESS_SHORT_CODE || '',
    b2cInitiatorName: process.env.MPESA_B2C_INITIATOR_NAME || 'testapi',
    b2cSecurityCredential: process.env.MPESA_B2C_SECURITY_CREDENTIAL || ''
  };
}

export function getMpesaUrls(environment: 'sandbox' | 'production') {
  return MPESA_URLS[environment];
}

export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function generatePassword(businessShortCode: string, passkey: string, timestamp: string): string {
  const data = businessShortCode + passkey + timestamp;
  return Buffer.from(data).toString('base64');
}

export function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('254')) {
    // Must be exactly 12 digits for Kenyan numbers
    if (cleaned.length !== 12) {
      throw new Error('Invalid phone number format');
    }
    // Validate it's a valid Kenyan mobile number (starts with 254 followed by 7 or 1)
    if (!cleaned.startsWith('2547') && !cleaned.startsWith('2541')) {
      throw new Error('Invalid phone number format');
    }
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    // Must be exactly 10 digits (0 + 9 digits)
    if (cleaned.length !== 10) {
      throw new Error('Invalid phone number format');
    }
    // Must start with 07 or 01 for Kenyan mobile
    if (!cleaned.startsWith('07') && !cleaned.startsWith('01')) {
      throw new Error('Invalid phone number format');
    }
    return '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    // Must be exactly 9 digits
    if (cleaned.length !== 9) {
      throw new Error('Invalid phone number format');
    }
    return '254' + cleaned;
  }
  
  throw new Error('Invalid phone number format');
}