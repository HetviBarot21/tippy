import { describe, it, expect } from 'vitest';
import { ValidationService } from '../../lib/services/validation.service';

describe('ValidationService', () => {
  describe('validateAndNormalizeMpesaPhone', () => {
    it('should validate and normalize correct Kenyan phone numbers', () => {
      const testCases = [
        {
          input: '+254712345678',
          expected: { isValid: true, normalizedPhone: '+254712345678' }
        },
        {
          input: '0712345678',
          expected: { isValid: true, normalizedPhone: '+254712345678' }
        },
        {
          input: '254712345678',
          expected: { isValid: true, normalizedPhone: '+254712345678' }
        },
        {
          input: '+254101234567',
          expected: { isValid: true, normalizedPhone: '+254101234567' }
        },
        {
          input: '0101234567',
          expected: { isValid: true, normalizedPhone: '+254101234567' }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = ValidationService.validateAndNormalizeMpesaPhone(input);
        expect(result.isValid).toBe(expected.isValid);
        expect(result.normalizedPhone).toBe(expected.normalizedPhone);
      });
    });

    it('should handle phone numbers with spaces and formatting', () => {
      const testCases = [
        '+254 712 345 678',
        '+254-712-345-678',
        '+254 (712) 345-678',
        '0712 345 678'
      ];

      testCases.forEach(input => {
        const result = ValidationService.validateAndNormalizeMpesaPhone(input);
        expect(result.isValid).toBe(true);
        expect(result.normalizedPhone).toBe('+254712345678');
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '712345678', // Missing country code
        '+1234567890', // Wrong country code
        '+254612345678', // Invalid network prefix
        '+254712345', // Too short
        '+2547123456789', // Too long
        '+254812345678', // Invalid network prefix
        'invalid',
        '',
        '+254'
      ];

      invalidNumbers.forEach(number => {
        const result = ValidationService.validateAndNormalizeMpesaPhone(number);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should validate network prefixes correctly', () => {
      // Valid Safaricom numbers (7xx)
      const safaricomNumbers = [
        '+254712345678',
        '+254722345678',
        '+254732345678',
        '+254742345678'
      ];

      safaricomNumbers.forEach(number => {
        const result = ValidationService.validateAndNormalizeMpesaPhone(number);
        expect(result.isValid).toBe(true);
      });

      // Valid Airtel numbers (1xx)
      const airtelNumbers = [
        '+254101234567',
        '+254111234567',
        '+254121234567'
      ];

      airtelNumbers.forEach(number => {
        const result = ValidationService.validateAndNormalizeMpesaPhone(number);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('isMpesaCompatible', () => {
    it('should return true for valid M-Pesa numbers', () => {
      const validNumbers = [
        '+254712345678',
        '0712345678',
        '+254101234567'
      ];

      validNumbers.forEach(number => {
        expect(ValidationService.isMpesaCompatible(number)).toBe(true);
      });
    });

    it('should return false for invalid M-Pesa numbers', () => {
      const invalidNumbers = [
        '+254612345678',
        '+1234567890',
        'invalid'
      ];

      invalidNumbers.forEach(number => {
        expect(ValidationService.isMpesaCompatible(number)).toBe(false);
      });
    });
  });

  describe('validateRestaurantSlug', () => {
    it('should validate correct slugs', () => {
      const validSlugs = [
        'restaurant-name',
        'cafe123',
        'my-restaurant-2024',
        'a',
        'test-restaurant-with-long-name'
      ];

      validSlugs.forEach(slug => {
        const result = ValidationService.validateRestaurantSlug(slug);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid slug formats', () => {
      const invalidSlugs = [
        'Restaurant Name', // Contains spaces and uppercase
        'restaurant_name', // Contains underscore
        'restaurant.name', // Contains dot
        '', // Empty
        '-restaurant', // Starts with hyphen
        'restaurant-', // Ends with hyphen
        'RESTAURANT', // Uppercase
        'restaurant name' // Contains space
      ];

      invalidSlugs.forEach(slug => {
        const result = ValidationService.validateRestaurantSlug(slug);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject reserved words', () => {
      const reservedWords = ['admin', 'api', 'www', 'app', 'dashboard', 'tip', 'qr'];

      reservedWords.forEach(word => {
        const result = ValidationService.validateRestaurantSlug(word);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('reserved word');
      });
    });

    it('should reject slugs that are too long', () => {
      const longSlug = 'a'.repeat(101);
      const result = ValidationService.validateRestaurantSlug(longSlug);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('between 1 and 100 characters');
    });
  });

  describe('validateCommissionRate', () => {
    it('should validate rates within valid range', () => {
      const validRates = [0, 5, 10, 25, 50, 75, 100];

      validRates.forEach(rate => {
        const result = ValidationService.validateCommissionRate(rate);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject rates outside valid range', () => {
      const invalidRates = [-1, -10, 101, 150, 200];

      invalidRates.forEach(rate => {
        const result = ValidationService.validateCommissionRate(rate);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('between 0 and 100 percent');
      });
    });
  });

  describe('validateTipAmount', () => {
    it('should validate amounts within valid range', () => {
      const validAmounts = [10, 50, 100, 500, 1000, 5000, 10000];

      validAmounts.forEach(amount => {
        const result = ValidationService.validateTipAmount(amount);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject amounts below minimum', () => {
      const belowMinimum = [0, 5, 9, 9.99];

      belowMinimum.forEach(amount => {
        const result = ValidationService.validateTipAmount(amount);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Minimum tip amount is 10 KES');
      });
    });

    it('should reject amounts above maximum', () => {
      const aboveMaximum = [10001, 15000, 50000];

      aboveMaximum.forEach(amount => {
        const result = ValidationService.validateTipAmount(amount);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Maximum tip amount is 10,000 KES');
      });
    });
  });
});