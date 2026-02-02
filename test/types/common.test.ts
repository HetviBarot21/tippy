import { describe, it, expect } from 'vitest';
import { 
  phoneNumberSchema, 
  emailSchema, 
  slugSchema, 
  tipAmountSchema, 
  commissionRateSchema, 
  percentageSchema,
  uuidSchema,
  monthSchema
} from '../../types/common';

describe('Common Type Validation Schemas', () => {
  describe('phoneNumberSchema', () => {
    it('should validate correct Kenyan phone numbers', () => {
      const validNumbers = [
        '+254712345678',
        '+254722345678',
        '+254101234567'
      ];

      validNumbers.forEach(number => {
        expect(() => phoneNumberSchema.parse(number)).not.toThrow();
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '0712345678', // Should be normalized to +254 format first
        '254712345678', // Missing +
        '+254612345678', // Invalid prefix (6xx not supported)
        '+254712345', // Too short
        '+2547123456789', // Too long
        '+1234567890', // Wrong country code
        'invalid'
      ];

      invalidNumbers.forEach(number => {
        expect(() => phoneNumberSchema.parse(number)).toThrow();
      });
    });
  });

  describe('emailSchema', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.ke',
        'admin+test@restaurant.com'
      ];

      validEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).not.toThrow();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).toThrow();
      });
    });
  });

  describe('slugSchema', () => {
    it('should validate correct slugs', () => {
      const validSlugs = [
        'restaurant-name',
        'cafe123',
        'my-restaurant-2024',
        'a'
      ];

      validSlugs.forEach(slug => {
        expect(() => slugSchema.parse(slug)).not.toThrow();
      });
    });

    it('should reject invalid slugs', () => {
      const invalidSlugs = [
        'Restaurant Name', // Contains spaces and uppercase
        'restaurant_name', // Contains underscore
        'restaurant.name', // Contains dot
        '', // Empty
        'a'.repeat(101), // Too long
        '-restaurant', // Starts with hyphen
        'restaurant-' // Ends with hyphen
      ];

      invalidSlugs.forEach(slug => {
        expect(() => slugSchema.parse(slug)).toThrow();
      });
    });
  });

  describe('tipAmountSchema', () => {
    it('should validate amounts within valid range', () => {
      const validAmounts = [10, 50, 100, 500, 1000, 10000];

      validAmounts.forEach(amount => {
        expect(() => tipAmountSchema.parse(amount)).not.toThrow();
      });
    });

    it('should reject amounts outside valid range', () => {
      const invalidAmounts = [9, 0, -10, 10001, 50000];

      invalidAmounts.forEach(amount => {
        expect(() => tipAmountSchema.parse(amount)).toThrow();
      });
    });
  });

  describe('commissionRateSchema', () => {
    it('should validate rates within 0-100 range', () => {
      const validRates = [0, 5, 10, 50, 100];

      validRates.forEach(rate => {
        expect(() => commissionRateSchema.parse(rate)).not.toThrow();
      });
    });

    it('should reject rates outside 0-100 range', () => {
      const invalidRates = [-1, -10, 101, 150];

      invalidRates.forEach(rate => {
        expect(() => commissionRateSchema.parse(rate)).toThrow();
      });
    });
  });

  describe('percentageSchema', () => {
    it('should validate percentages within 0-100 range', () => {
      const validPercentages = [0, 25.5, 50, 75.25, 100];

      validPercentages.forEach(percentage => {
        expect(() => percentageSchema.parse(percentage)).not.toThrow();
      });
    });

    it('should reject percentages outside 0-100 range', () => {
      const invalidPercentages = [-0.1, -10, 100.1, 150];

      invalidPercentages.forEach(percentage => {
        expect(() => percentageSchema.parse(percentage)).toThrow();
      });
    });
  });

  describe('uuidSchema', () => {
    it('should validate correct UUIDs', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUuids.forEach(uuid => {
        expect(() => uuidSchema.parse(uuid)).not.toThrow();
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUuids = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        '123e4567e89b12d3a456426614174000', // Missing hyphens
        ''
      ];

      invalidUuids.forEach(uuid => {
        expect(() => uuidSchema.parse(uuid)).toThrow();
      });
    });
  });

  describe('monthSchema', () => {
    it('should validate correct month formats', () => {
      const validMonths = ['2024-01', '2024-12', '2023-06'];

      validMonths.forEach(month => {
        expect(() => monthSchema.parse(month)).not.toThrow();
      });
    });

    it('should reject invalid month formats', () => {
      const invalidMonths = [
        '2024-1', // Single digit month
        '24-01', // Two digit year
        '2024/01', // Wrong separator
        '2024-13', // Invalid month
        '2024-00', // Invalid month
        'January 2024',
        '2024', // Missing month
        '01' // Missing year
      ];

      invalidMonths.forEach(month => {
        expect(() => monthSchema.parse(month)).toThrow();
      });
    });
  });
});