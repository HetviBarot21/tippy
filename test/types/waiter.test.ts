import { describe, it, expect } from 'vitest';
import { 
  createWaiterSchema, 
  updateWaiterSchema, 
  waiterParamsSchema,
  waiterQuerySchema 
} from '../../types/waiter';

describe('Waiter Type Validation Schemas', () => {
  describe('createWaiterSchema', () => {
    it('should validate correct waiter creation data', () => {
      const validData = {
        restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        phone_number: '+254712345678',
        email: 'john@restaurant.com',
        profile_photo_url: 'https://example.com/photo.jpg'
      };

      expect(() => createWaiterSchema.parse(validData)).not.toThrow();
    });

    it('should validate minimal required data', () => {
      const minimalData = {
        restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        phone_number: '+254712345678'
      };

      expect(() => createWaiterSchema.parse(minimalData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const invalidDataSets = [
        {
          // Missing required fields
          name: 'John Doe'
        },
        {
          // Invalid restaurant_id
          restaurant_id: 'not-a-uuid',
          name: 'John Doe',
          phone_number: '+254712345678'
        },
        {
          // Invalid phone number (should be +254 format)
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'John Doe',
          phone_number: '0712345678'
        },
        {
          // Invalid email
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'John Doe',
          phone_number: '+254712345678',
          email: 'invalid-email'
        },
        {
          // Invalid profile photo URL
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'John Doe',
          phone_number: '+254712345678',
          profile_photo_url: 'not-a-url'
        }
      ];

      invalidDataSets.forEach(data => {
        expect(() => createWaiterSchema.parse(data)).toThrow();
      });
    });

    it('should handle optional fields correctly', () => {
      const dataWithOptionals = {
        restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        phone_number: '+254712345678',
        email: 'john@restaurant.com',
        profile_photo_url: 'https://example.com/photo.jpg'
      };

      const result = createWaiterSchema.parse(dataWithOptionals);
      expect(result.email).toBe('john@restaurant.com');
      expect(result.profile_photo_url).toBe('https://example.com/photo.jpg');
    });
  });

  describe('updateWaiterSchema', () => {
    it('should validate partial update data', () => {
      const validUpdates = [
        { name: 'Updated Name' },
        { phone_number: '+254701234567' },
        { email: 'newemail@restaurant.com' },
        { profile_photo_url: 'https://example.com/newphoto.jpg' },
        { is_active: false },
        {
          name: 'Updated Name',
          email: 'updated@restaurant.com',
          is_active: true
        }
      ];

      validUpdates.forEach(update => {
        expect(() => updateWaiterSchema.parse(update)).not.toThrow();
      });
    });

    it('should reject invalid update data', () => {
      const invalidUpdates = [
        { name: '' }, // Empty name
        { phone_number: '0712345678' }, // Invalid format (should be +254)
        { email: 'invalid-email' },
        { profile_photo_url: 'not-a-url' },
        { name: 'a'.repeat(256) } // Too long name
      ];

      invalidUpdates.forEach(update => {
        expect(() => updateWaiterSchema.parse(update)).toThrow();
      });
    });

    it('should allow empty update object', () => {
      expect(() => updateWaiterSchema.parse({})).not.toThrow();
    });
  });

  describe('waiterParamsSchema', () => {
    it('should validate correct UUID parameters', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(() => waiterParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should reject invalid UUID parameters', () => {
      const invalidParams = [
        { id: 'not-a-uuid' },
        { id: '123' },
        { id: '' },
        {} // Missing id
      ];

      invalidParams.forEach(params => {
        expect(() => waiterParamsSchema.parse(params)).toThrow();
      });
    });
  });

  describe('waiterQuerySchema', () => {
    it('should validate correct query parameters', () => {
      const validQueries = [
        {},
        { restaurant_id: '123e4567-e89b-12d3-a456-426614174000' },
        { is_active: true },
        { search: 'John' },
        {
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          is_active: false,
          search: 'Doe'
        }
      ];

      validQueries.forEach(query => {
        expect(() => waiterQuerySchema.parse(query)).not.toThrow();
      });
    });

    it('should reject invalid query parameters', () => {
      const invalidQueries = [
        { restaurant_id: 'not-a-uuid' },
        { is_active: 'true' }, // Should be boolean
        { search: 123 } // Should be string
      ];

      invalidQueries.forEach(query => {
        expect(() => waiterQuerySchema.parse(query)).toThrow();
      });
    });
  });
});