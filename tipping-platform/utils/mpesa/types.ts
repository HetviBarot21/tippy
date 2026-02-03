/**
 * M-Pesa API types and interfaces
 */

export interface MPesaOAuthResponse {
  access_token: string;
  expires_in: string;
}

export interface STKPushRequest {
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

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface STKPushCallbackRequest {
  Body: {
    stkCallback: {
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
    };
  };
}

export interface STKPushQueryRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  CheckoutRequestID: string;
}

export interface STKPushQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export interface MPesaTransactionDetails {
  amount: number;
  mpesaReceiptNumber: string;
  transactionDate: string;
  phoneNumber: string;
}

export interface MPesaError {
  requestId: string;
  errorCode: string;
  errorMessage: string;
}

export type MPesaTransactionStatus = 
  | 'pending'
  | 'processing' 
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface MPesaTransaction {
  id: string;
  tipId: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  phoneNumber: string;
  amount: number;
  status: MPesaTransactionStatus;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}