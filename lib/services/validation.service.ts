import { phoneNumberSchema } from '../../types/common';

/**
 * Validation service for M-Pesa and other business logic validations
 */
export class ValidationService {
  /**
   * Validates a Kenyan phone number for M-Pesa compatibility
   * Accepts formats: +254712345678, 0712345678, 254712345678
   * Returns normalized format: +254712345678
   */
  static validateAndNormalizeMpesaPhone(phoneNumber: string): {
    isValid: boolean;
    normalizedPhone?: string;
    error?: string;
  } {
    try {
      // Remove all spaces and special characters except +
      const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
      
      // Normalize different formats to +254 format
      let normalized = cleaned;
      
      if (cleaned.startsWith('0')) {
        // Convert 0712345678 to +254712345678
        normalized = '+254' + cleaned.substring(1);
      } else if (cleaned.startsWith('254') && !cleaned.startsWith('+254')) {
        // Convert 254712345678 to +254712345678
        normalized = '+' + cleaned;
      } else if (!cleaned.startsWith('+254')) {
        return {
          isValid: false,
          error: 'Phone number must start with +254, 254, or 0'
        };
      }

      // Validate using Zod schema
      const result = phoneNumberSchema.safeParse(normalized);
      
      if (!result.success) {
        return {
          isValid: false,
          error: result.error.errors[0]?.message || 'Invalid phone number format'
        };
      }

      // Additional M-Pesa specific validations
      const phoneDigits = normalized.substring(4); // Remove +254
      
      // Check if it's a valid Kenyan mobile network
      const validPrefixes = ['7', '1']; // Safaricom (7xx), Airtel (1xx)
      if (!validPrefixes.some(prefix => phoneDigits.startsWith(prefix))) {
        return {
          isValid: false,
          error: 'Phone number must be from a supported mobile network (Safaricom or Airtel)'
        };
      }

      return {
        isValid: true,
        normalizedPhone: normalized
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid phone number format'
      };
    }
  }

  /**
   * Validates if a phone number is M-Pesa compatible
   */
  static isMpesaCompatible(phoneNumber: string): boolean {
    const result = this.validateAndNormalizeMpesaPhone(phoneNumber);
    return result.isValid;
  }

  /**
   * Validates restaurant slug uniqueness format
   */
  static validateRestaurantSlug(slug: string): {
    isValid: boolean;
    error?: string;
  } {
    // Check basic format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return {
        isValid: false,
        error: 'Slug must contain only lowercase letters, numbers, and hyphens'
      };
    }

    // Check length
    if (slug.length < 1 || slug.length > 100) {
      return {
        isValid: false,
        error: 'Slug must be between 1 and 100 characters'
      };
    }

    // Check for reserved words
    const reservedWords = ['admin', 'api', 'www', 'app', 'dashboard', 'tip', 'qr'];
    if (reservedWords.includes(slug)) {
      return {
        isValid: false,
        error: 'Slug cannot be a reserved word'
      };
    }

    return { isValid: true };
  }

  /**
   * Validates commission rate
   */
  static validateCommissionRate(rate: number): {
    isValid: boolean;
    error?: string;
  } {
    if (rate < 0 || rate > 100) {
      return {
        isValid: false,
        error: 'Commission rate must be between 0 and 100 percent'
      };
    }

    return { isValid: true };
  }

  /**
   * Validates tip amount for Kenyan market
   */
  static validateTipAmount(amount: number): {
    isValid: boolean;
    error?: string;
  } {
    if (amount < 10) {
      return {
        isValid: false,
        error: 'Minimum tip amount is 10 KES'
      };
    }

    if (amount > 10000) {
      return {
        isValid: false,
        error: 'Maximum tip amount is 10,000 KES'
      };
    }

    return { isValid: true };
  }
}