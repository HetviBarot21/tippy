/**
 * PesaWise API Types
 * TypeScript interfaces for PesaWise API requests and responses
 */

// STK Push Request
export interface PesaWiseSTKPushRequest {
  phone: string;
  amount: number;
  reference: string;
  description: string;
  callback_url?: string;
}

// STK Push Response
export interface PesaWiseSTKPushResponse {
  success: boolean;
  message: string;
  data?: {
    checkout_request_id: string;
    merchant_request_id: string;
    response_code: string;
    response_description: string;
    customer_message: string;
  };
  error?: string;
}

// Payment Status Query Request
export interface PesaWiseStatusQueryRequest {
  checkout_request_id: string;
}

// Payment Status Query Response
export interface PesaWiseStatusQueryResponse {
  success: boolean;
  message: string;
  data?: {
    checkout_request_id: string;
    merchant_request_id: string;
    result_code: string;
    result_desc: string;
    amount?: number;
    mpesa_receipt_number?: string;
    transaction_date?: string;
    phone_number?: string;
  };
  error?: string;
}

// Webhook Callback Data
export interface PesaWiseCallbackData {
  checkout_request_id: string;
  merchant_request_id: string;
  result_code: string;
  result_desc: string;
  amount?: number;
  mpesa_receipt_number?: string;
  transaction_date?: string;
  phone_number?: string;
}

// Balance Query Response
export interface PesaWiseBalanceResponse {
  success: boolean;
  message: string;
  data?: {
    account_balance: number;
    available_balance: number;
    reserved_balance: number;
  };
  error?: string;
}

// Transaction History Response
export interface PesaWiseTransactionHistoryResponse {
  success: boolean;
  message: string;
  data?: {
    transactions: Array<{
      id: string;
      type: string;
      amount: number;
      phone: string;
      reference: string;
      description: string;
      status: string;
      mpesa_receipt_number?: string;
      created_at: string;
      updated_at: string;
    }>;
    pagination: {
      current_page: number;
      total_pages: number;
      total_records: number;
      per_page: number;
    };
  };
  error?: string;
}

// Error Response
export interface PesaWiseErrorResponse {
  success: false;
  message: string;
  error: string;
  errors?: Record<string, string[]>;
}