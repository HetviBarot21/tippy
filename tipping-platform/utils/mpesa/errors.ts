/**
 * M-Pesa Error Handling Utilities
 * Comprehensive error handling for M-Pesa API responses and common scenarios
 */

export interface MPesaErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  category: 'network' | 'validation' | 'business' | 'system' | 'timeout';
}

export class MPesaErrorHandler {
  
  /**
   * M-Pesa result code mappings
   */
  private static readonly RESULT_CODES: Record<number, MPesaErrorDetails> = {
    0: {
      code: 'SUCCESS',
      message: 'The service request is processed successfully',
      userMessage: 'Payment completed successfully',
      retryable: false,
      category: 'business'
    },
    1: {
      code: 'INSUFFICIENT_FUNDS',
      message: 'The balance is insufficient for the transaction',
      userMessage: 'Insufficient M-Pesa balance. Please top up and try again.',
      retryable: true,
      category: 'business'
    },
    2: {
      code: 'LESS_THAN_MINIMUM',
      message: 'The amount being transacted is less than the minimum allowed',
      userMessage: 'Amount is below minimum allowed. Please increase the amount.',
      retryable: true,
      category: 'validation'
    },
    3: {
      code: 'MORE_THAN_MAXIMUM',
      message: 'The amount being transacted is more than the maximum allowed',
      userMessage: 'Amount exceeds maximum allowed. Please reduce the amount.',
      retryable: true,
      category: 'validation'
    },
    4: {
      code: 'WOULD_EXCEED_DAILY_LIMIT',
      message: 'The amount being transacted would exceed the daily transaction limit',
      userMessage: 'Transaction would exceed daily limit. Please try a smaller amount.',
      retryable: true,
      category: 'business'
    },
    5: {
      code: 'WOULD_EXCEED_MINIMUM_BALANCE',
      message: 'The amount being transacted would leave the account with a balance below the minimum allowed',
      userMessage: 'Transaction would leave insufficient balance. Please try a smaller amount.',
      retryable: true,
      category: 'business'
    },
    6: {
      code: 'UNRESOLVED_PRIMARY_PARTY',
      message: 'Unresolved primary party',
      userMessage: 'Account verification failed. Please check your M-Pesa account.',
      retryable: true,
      category: 'business'
    },
    7: {
      code: 'UNRESOLVED_RECEIVER_PARTY',
      message: 'Unresolved receiver party',
      userMessage: 'Recipient account verification failed. Please contact support.',
      retryable: false,
      category: 'business'
    },
    8: {
      code: 'WOULD_EXCEED_MAXIUMUM_BALANCE',
      message: 'The amount being transacted would exceed the maximum balance allowed on the account',
      userMessage: 'Transaction would exceed maximum balance limit.',
      retryable: false,
      category: 'business'
    },
    11: {
      code: 'DEBIT_ACCOUNT_INVALID',
      message: 'Debit account is invalid',
      userMessage: 'Invalid M-Pesa account. Please check your phone number.',
      retryable: true,
      category: 'validation'
    },
    12: {
      code: 'CREDIT_ACCOUNT_INVALID',
      message: 'Credit account is invalid',
      userMessage: 'Invalid recipient account. Please contact support.',
      retryable: false,
      category: 'validation'
    },
    13: {
      code: 'UNRESOLVED_DEBIT_ACCOUNT',
      message: 'Unresolved debit account',
      userMessage: 'Could not verify your M-Pesa account. Please try again.',
      retryable: true,
      category: 'business'
    },
    14: {
      code: 'UNRESOLVED_CREDIT_ACCOUNT',
      message: 'Unresolved credit account',
      userMessage: 'Could not verify recipient account. Please contact support.',
      retryable: false,
      category: 'business'
    },
    15: {
      code: 'DUPLICATE_DETECTED',
      message: 'Duplicate detected',
      userMessage: 'Duplicate transaction detected. Please wait before retrying.',
      retryable: true,
      category: 'business'
    },
    17: {
      code: 'INTERNAL_FAILURE',
      message: 'Internal failure',
      userMessage: 'System error occurred. Please try again later.',
      retryable: true,
      category: 'system'
    },
    20: {
      code: 'UNRESOLVED_INITIATOR',
      message: 'Unresolved initiator',
      userMessage: 'Transaction initiation failed. Please try again.',
      retryable: true,
      category: 'system'
    },
    26: {
      code: 'TRAFFIC_BLOCKING_CONDITION',
      message: 'Traffic blocking condition in place',
      userMessage: 'Service temporarily unavailable. Please try again later.',
      retryable: true,
      category: 'system'
    },
    1032: {
      code: 'CANCELLED_BY_USER',
      message: 'Request cancelled by user',
      userMessage: 'Payment was cancelled. You can try again anytime.',
      retryable: true,
      category: 'business'
    },
    1037: {
      code: 'TIMEOUT',
      message: 'DS timeout user cannot be reached',
      userMessage: 'Payment request timed out. Please ensure your phone is on and try again.',
      retryable: true,
      category: 'timeout'
    },
    2001: {
      code: 'INVALID_INITIATOR',
      message: 'The initiator information is invalid',
      userMessage: 'System configuration error. Please contact support.',
      retryable: false,
      category: 'system'
    },
    9999: {
      code: 'REQUEST_TIMEOUT',
      message: 'Request timeout',
      userMessage: 'Request timed out. Please try again.',
      retryable: true,
      category: 'timeout'
    }
  };

  /**
   * HTTP error mappings
   */
  private static readonly HTTP_ERRORS: Record<number, MPesaErrorDetails> = {
    400: {
      code: 'BAD_REQUEST',
      message: 'Bad request - invalid parameters',
      userMessage: 'Invalid request. Please check your details and try again.',
      retryable: false,
      category: 'validation'
    },
    401: {
      code: 'UNAUTHORIZED',
      message: 'Unauthorized - invalid credentials',
      userMessage: 'Authentication failed. Please contact support.',
      retryable: false,
      category: 'system'
    },
    403: {
      code: 'FORBIDDEN',
      message: 'Forbidden - access denied',
      userMessage: 'Access denied. Please contact support.',
      retryable: false,
      category: 'system'
    },
    404: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      userMessage: 'Service not found. Please contact support.',
      retryable: false,
      category: 'system'
    },
    429: {
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      userMessage: 'Too many requests. Please wait a moment and try again.',
      retryable: true,
      category: 'system'
    },
    500: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      userMessage: 'System error occurred. Please try again later.',
      retryable: true,
      category: 'system'
    },
    502: {
      code: 'BAD_GATEWAY',
      message: 'Bad gateway',
      userMessage: 'Service temporarily unavailable. Please try again later.',
      retryable: true,
      category: 'network'
    },
    503: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service unavailable',
      userMessage: 'M-Pesa service is temporarily unavailable. Please try again later.',
      retryable: true,
      category: 'network'
    },
    504: {
      code: 'GATEWAY_TIMEOUT',
      message: 'Gateway timeout',
      userMessage: 'Request timed out. Please try again.',
      retryable: true,
      category: 'timeout'
    }
  };

  /**
   * Parse M-Pesa result code and return error details
   */
  static parseResultCode(resultCode: number): MPesaErrorDetails {
    return this.RESULT_CODES[resultCode] || {
      code: 'UNKNOWN_RESULT_CODE',
      message: `Unknown result code: ${resultCode}`,
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      retryable: true,
      category: 'system'
    };
  }

  /**
   * Parse HTTP status code and return error details
   */
  static parseHttpError(statusCode: number): MPesaErrorDetails {
    return this.HTTP_ERRORS[statusCode] || {
      code: 'UNKNOWN_HTTP_ERROR',
      message: `Unknown HTTP error: ${statusCode}`,
      userMessage: 'A network error occurred. Please check your connection and try again.',
      retryable: true,
      category: 'network'
    };
  }

  /**
   * Handle M-Pesa API errors with context
   */
  static handleApiError(error: any, context: string = 'M-Pesa API'): MPesaErrorDetails {
    // Network/fetch errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        userMessage: 'Network error. Please check your internet connection and try again.',
        retryable: true,
        category: 'network'
      };
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'Request timeout',
        userMessage: 'Request timed out. Please try again.',
        retryable: true,
        category: 'timeout'
      };
    }

    // HTTP status errors
    if (error.status) {
      return this.parseHttpError(error.status);
    }

    // M-Pesa result code errors
    if (error.resultCode !== undefined) {
      return this.parseResultCode(error.resultCode);
    }

    // Generic error
    return {
      code: 'GENERIC_ERROR',
      message: error.message || 'Unknown error occurred',
      userMessage: 'An error occurred. Please try again or contact support.',
      retryable: true,
      category: 'system'
    };
  }

  /**
   * Determine if an error should trigger a retry
   */
  static shouldRetry(error: MPesaErrorDetails, attemptCount: number = 0): boolean {
    const maxRetries = 3;
    
    if (attemptCount >= maxRetries) {
      return false;
    }

    return error.retryable && ['network', 'timeout', 'system'].includes(error.category);
  }

  /**
   * Get retry delay based on attempt count (exponential backoff)
   */
  static getRetryDelay(attemptCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
    
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Log error with appropriate level and context
   */
  static logError(error: MPesaErrorDetails, context: string, additionalData?: any): void {
    const logData = {
      code: error.code,
      message: error.message,
      category: error.category,
      retryable: error.retryable,
      context,
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    // Log based on error category
    switch (error.category) {
      case 'validation':
        console.warn('M-Pesa Validation Error:', logData);
        break;
      case 'business':
        console.info('M-Pesa Business Error:', logData);
        break;
      case 'network':
      case 'timeout':
        console.warn('M-Pesa Network/Timeout Error:', logData);
        break;
      case 'system':
        console.error('M-Pesa System Error:', logData);
        break;
      default:
        console.error('M-Pesa Unknown Error:', logData);
    }
  }

  /**
   * Create user-friendly error response
   */
  static createErrorResponse(error: MPesaErrorDetails, tipId?: string): {
    success: false;
    error: string;
    code: string;
    retryable: boolean;
    tipId?: string;
  } {
    return {
      success: false,
      error: error.userMessage,
      code: error.code,
      retryable: error.retryable,
      ...(tipId && { tipId })
    };
  }
}

/**
 * M-Pesa specific error class
 */
export class MPesaError extends Error {
  public readonly details: MPesaErrorDetails;
  public readonly context: string;
  public readonly tipId?: string;

  constructor(details: MPesaErrorDetails, context: string = 'M-Pesa', tipId?: string) {
    super(details.message);
    this.name = 'MPesaError';
    this.details = details;
    this.context = context;
    this.tipId = tipId;
  }

  /**
   * Check if this error should trigger a retry
   */
  shouldRetry(attemptCount: number = 0): boolean {
    return MPesaErrorHandler.shouldRetry(this.details, attemptCount);
  }

  /**
   * Get retry delay for this error
   */
  getRetryDelay(attemptCount: number): number {
    return MPesaErrorHandler.getRetryDelay(attemptCount);
  }

  /**
   * Log this error
   */
  log(additionalData?: any): void {
    MPesaErrorHandler.logError(this.details, this.context, {
      tipId: this.tipId,
      ...additionalData
    });
  }

  /**
   * Convert to API response format
   */
  toResponse(): ReturnType<typeof MPesaErrorHandler.createErrorResponse> {
    return MPesaErrorHandler.createErrorResponse(this.details, this.tipId);
  }
}