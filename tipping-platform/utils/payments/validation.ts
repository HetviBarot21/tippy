/**
 * Payment validation utilities to ensure consistent processing
 * across different payment methods (M-Pesa and cards)
 */

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TipValidationData {
  amount: number;
  tipType: 'waiter' | 'restaurant';
  restaurantId: string;
  waiterId?: string;
  tableId?: string; // Optional since universal QR codes don't have table selection
  paymentMethod: 'card' | 'mpesa';
  customerPhone?: string;
}

export class PaymentValidator {
  
  /**
   * Validate tip amount according to business rules
   */
  static validateAmount(amount: number): PaymentValidationResult {
    const errors: string[] = [];

    if (!amount || typeof amount !== 'number') {
      errors.push('Amount is required and must be a number');
    } else if (amount < 10) {
      errors.push('Minimum tip amount is 10 KES');
    } else if (amount > 10000) {
      errors.push('Maximum tip amount is 10,000 KES');
    } else if (amount % 1 !== 0) {
      errors.push('Amount must be a whole number (no decimals)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate phone number for M-Pesa payments
   */
  static validatePhoneNumber(phoneNumber: string): PaymentValidationResult {
    const errors: string[] = [];

    if (!phoneNumber) {
      errors.push('Phone number is required for M-Pesa payments');
      return { isValid: false, errors };
    }

    // Remove any spaces, dashes, or plus signs
    const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');

    // Check if it's a valid Kenyan phone number
    const kenyaPhoneRegex = /^(254|0)?[17]\d{8}$/;
    
    if (!kenyaPhoneRegex.test(cleanPhone)) {
      errors.push('Invalid Kenyan phone number format. Use format: 254712345678 or 0712345678');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate tip data for consistency across payment methods
   */
  static validateTipData(data: TipValidationData): PaymentValidationResult {
    const errors: string[] = [];

    // Validate required fields
    if (!data.restaurantId) {
      errors.push('Restaurant ID is required');
    }

    // tableId is optional for universal QR codes
    // if (!data.tableId) {
    //   errors.push('Table ID is required');
    // }

    if (!data.tipType || !['waiter', 'restaurant'].includes(data.tipType)) {
      errors.push('Valid tip type is required (waiter or restaurant)');
    }

    if (!data.paymentMethod || !['card', 'mpesa'].includes(data.paymentMethod)) {
      errors.push('Valid payment method is required (card or mpesa)');
    }

    // Validate waiter requirement for waiter tips
    if (data.tipType === 'waiter' && !data.waiterId) {
      errors.push('Waiter ID is required for waiter tips');
    }

    // Validate amount
    const amountValidation = this.validateAmount(data.amount);
    if (!amountValidation.isValid) {
      errors.push(...amountValidation.errors);
    }

    // Validate phone number for M-Pesa
    if (data.paymentMethod === 'mpesa' && data.customerPhone) {
      const phoneValidation = this.validatePhoneNumber(data.customerPhone);
      if (!phoneValidation.isValid) {
        errors.push(...phoneValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize phone number to standard format (254XXXXXXXXX)
   */
  static normalizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';

    // Remove any spaces, dashes, or plus signs
    let cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');

    // Convert 0712345678 to 254712345678
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.substring(1);
    }

    return cleanPhone;
  }

  /**
   * Calculate commission with consistent rounding across payment methods
   */
  static calculateCommission(amount: number, commissionRate: number): {
    commissionAmount: number;
    netAmount: number;
  } {
    // Ensure consistent decimal precision (2 decimal places)
    const commissionAmount = Math.round((amount * commissionRate) / 100 * 100) / 100;
    const netAmount = Math.round((amount - commissionAmount) * 100) / 100;

    return {
      commissionAmount,
      netAmount
    };
  }

  /**
   * Validate commission rate
   */
  static validateCommissionRate(rate: number): PaymentValidationResult {
    const errors: string[] = [];

    if (typeof rate !== 'number') {
      errors.push('Commission rate must be a number');
    } else if (rate < 0) {
      errors.push('Commission rate cannot be negative');
    } else if (rate > 50) {
      errors.push('Commission rate cannot exceed 50%');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate payment method specific requirements
   */
  static validatePaymentMethodRequirements(
    paymentMethod: 'card' | 'mpesa',
    data: { customerPhone?: string }
  ): PaymentValidationResult {
    const errors: string[] = [];

    if (paymentMethod === 'mpesa') {
      if (!data.customerPhone) {
        errors.push('Phone number is required for M-Pesa payments');
      } else {
        const phoneValidation = this.validatePhoneNumber(data.customerPhone);
        if (!phoneValidation.isValid) {
          errors.push(...phoneValidation.errors);
        }
      }
    }

    // Card payments don't have additional requirements beyond standard validation

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Utility function to format validation errors for API responses
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return `Multiple validation errors: ${errors.join('; ')}`;
}