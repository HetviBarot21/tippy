import { describe, it, expect } from 'vitest';
import { 
  createRestaurantSchema, 
  updateRestaurantSchema, 
  restaurantParamsSchema 
} from '../../types/restaurant';

describe('Restaurant Type Validation Schemas', () => {
  describe('createRestaurantSchema', () => {
    it('should validate correct restaurant creation data', () => {
      const validData = {
        name: 'Test Restaurant',
        slug: 'test-restaurant',
        email: 'admin@testrestaurant.com',
        phone_number: '+254712345678',
        address: '123 Test Street, Nairobi',
        commission_rate: 10
      };

      expect(() => createRestaurantSchema.parse(validData)).not.toThrow();
    });

    it('should validate minimal required data', () => {
      const minimalData = {
        name: 'Test Restaurant',
        slug: 'test-restaurant',
        email: 'admin@testrestaurant.com'
      };

      const result = createRestaurantSchema.parse(minimalData);
      expect(result.commission_rate).toBe(10); // Default value
    });

    it('should reject invalid data', () => {
      const invalidDataSets = [
        {
          // Missing required fields
          name: 'Test Restaurant'
        },
        {
          // Invalid email
          name: 'Test Restaurant',
          slug: 'test-restaurant',
          email: 'invalid-email'
        },
        {
          // Invalid slug
          name: 'Test Restaurant',
          slug: 'Test Restaurant',
          email: 'admin@testrestaurant.com'
        },
        {
          // Invalid phone number (should be +254 format)
          name: 'Test Restaurant',
          slug: 'test-restaurant',
          email: 'admin@testrestaurant.com',
          phone_number: '0712345678'
        },
        {
          // Invalid commission rate
          name: 'Test Restaurant',
          slug: 'test-restaurant',
          email: 'admin@testrestaurant.com',
          commission_rate: 150
        }
      ];

      invalidDataSets.forEach(data => {
        expect(() => createRestaurantSchema.parse(data)).toThrow();
      });
    });

    it('should handle optional fields correctly', () => {
      const dataWithOptionals = {
        name: 'Test Restaurant',
        slug: 'test-restaurant',
        email: 'admin@testrestaurant.com',
        phone_number: '+254712345678',
        address: '123 Test Street',
        commission_rate: 15
      };

      const result = createRestaurantSchema.parse(dataWithOptionals);
      expect(result.phone_number).toBe('+254712345678');
      expect(result.address).toBe('123 Test Street');
      expect(result.commission_rate).toBe(15);
    });
  });

  describe('updateRestaurantSchema', () => {
    it('should validate partial update data', () => {
      const validUpdates = [
        { name: 'Updated Restaurant Name' },
        { email: 'newemail@restaurant.com' },
        { phone_number: '+254701234567' },
        { address: 'New Address' },
        { commission_rate: 12 },
        { is_active: false },
        {
          name: 'Updated Name',
          email: 'updated@restaurant.com',
          commission_rate: 8
        }
      ];

      validUpdates.forEach(update => {
        expect(() => updateRestaurantSchema.parse(update)).not.toThrow();
      });
    });

    it('should reject invalid update data', () => {
      const invalidUpdates = [
        { email: 'invalid-email' },
        { phone_number: '0712345678' }, // Should be +254 format
        { commission_rate: -5 },
        { commission_rate: 150 },
        { name: '' }, // Empty name
        { address: 'a'.repeat(501) } // Too long address
      ];

      invalidUpdates.forEach(update => {
        expect(() => updateRestaurantSchema.parse(update)).toThrow();
      });
    });

    it('should allow empty update object', () => {
      expect(() => updateRestaurantSchema.parse({})).not.toThrow();
    });
  });

  describe('restaurantParamsSchema', () => {
    it('should validate correct UUID parameters', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(() => restaurantParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should reject invalid UUID parameters', () => {
      const invalidParams = [
        { id: 'not-a-uuid' },
        { id: '123' },
        { id: '' },
        {} // Missing id
      ];

      invalidParams.forEach(params => {
        expect(() => restaurantParamsSchema.parse(params)).toThrow();
      });
    });
  });
});