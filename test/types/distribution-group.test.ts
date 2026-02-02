import { describe, it, expect } from 'vitest';
import { 
  createDistributionGroupSchema, 
  updateDistributionGroupSchema, 
  distributionConfigSchema,
  defaultDistributionGroups
} from '../../types/distribution-group';

describe('Distribution Group Type Validation Schemas', () => {
  describe('createDistributionGroupSchema', () => {
    it('should validate correct distribution group creation data', () => {
      const validData = {
        restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
        group_name: 'waiters',
        percentage: 30
      };

      expect(() => createDistributionGroupSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const invalidDataSets = [
        {
          // Missing required fields
          group_name: 'waiters'
        },
        {
          // Invalid restaurant_id
          restaurant_id: 'not-a-uuid',
          group_name: 'waiters',
          percentage: 30
        },
        {
          // Invalid percentage (negative)
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          group_name: 'waiters',
          percentage: -10
        },
        {
          // Invalid percentage (over 100)
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          group_name: 'waiters',
          percentage: 150
        },
        {
          // Empty group name
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          group_name: '',
          percentage: 30
        }
      ];

      invalidDataSets.forEach(data => {
        expect(() => createDistributionGroupSchema.parse(data)).toThrow();
      });
    });

    it('should validate edge case percentages', () => {
      const edgeCases = [
        { percentage: 0 },
        { percentage: 100 },
        { percentage: 0.01 },
        { percentage: 99.99 }
      ];

      edgeCases.forEach(({ percentage }) => {
        const data = {
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          group_name: 'test-group',
          percentage
        };
        expect(() => createDistributionGroupSchema.parse(data)).not.toThrow();
      });
    });
  });

  describe('updateDistributionGroupSchema', () => {
    it('should validate partial update data', () => {
      const validUpdates = [
        { group_name: 'updated-group' },
        { percentage: 25 },
        { group_name: 'new-group', percentage: 40 }
      ];

      validUpdates.forEach(update => {
        expect(() => updateDistributionGroupSchema.parse(update)).not.toThrow();
      });
    });

    it('should reject invalid update data', () => {
      const invalidUpdates = [
        { group_name: '' }, // Empty name
        { percentage: -5 }, // Negative percentage
        { percentage: 150 }, // Over 100 percentage
        { group_name: 'a'.repeat(101) } // Too long name
      ];

      invalidUpdates.forEach(update => {
        expect(() => updateDistributionGroupSchema.parse(update)).toThrow();
      });
    });

    it('should allow empty update object', () => {
      expect(() => updateDistributionGroupSchema.parse({})).not.toThrow();
    });
  });

  describe('distributionConfigSchema', () => {
    it('should validate correct distribution configuration', () => {
      const validConfig = {
        restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
        groups: [
          { group_name: 'cleaners', percentage: 10 },
          { group_name: 'waiters', percentage: 30 },
          { group_name: 'admin', percentage: 40 },
          { group_name: 'owners', percentage: 20 }
        ]
      };

      expect(() => distributionConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should validate alternative distribution that sums to 100', () => {
      const validConfig = {
        restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
        groups: [
          { group_name: 'staff', percentage: 60 },
          { group_name: 'management', percentage: 40 }
        ]
      };

      expect(() => distributionConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject configuration where percentages do not sum to 100', () => {
      const invalidConfigs = [
        {
          // Sums to 90
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          groups: [
            { group_name: 'cleaners', percentage: 10 },
            { group_name: 'waiters', percentage: 30 },
            { group_name: 'admin', percentage: 30 },
            { group_name: 'owners', percentage: 20 }
          ]
        },
        {
          // Sums to 110
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          groups: [
            { group_name: 'cleaners', percentage: 20 },
            { group_name: 'waiters', percentage: 40 },
            { group_name: 'admin', percentage: 30 },
            { group_name: 'owners', percentage: 20 }
          ]
        }
      ];

      invalidConfigs.forEach(config => {
        expect(() => distributionConfigSchema.parse(config)).toThrow();
      });
    });

    it('should reject empty groups array', () => {
      const invalidConfig = {
        restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
        groups: []
      };

      expect(() => distributionConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should handle floating point precision in percentage validation', () => {
      const configWithFloats = {
        restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
        groups: [
          { group_name: 'group1', percentage: 33.33 },
          { group_name: 'group2', percentage: 33.33 },
          { group_name: 'group3', percentage: 33.34 }
        ]
      };

      expect(() => distributionConfigSchema.parse(configWithFloats)).not.toThrow();
    });
  });

  describe('defaultDistributionGroups', () => {
    it('should have correct default values', () => {
      expect(defaultDistributionGroups).toEqual([
        { group_name: 'cleaners', percentage: 10 },
        { group_name: 'waiters', percentage: 30 },
        { group_name: 'admin', percentage: 40 },
        { group_name: 'owners', percentage: 20 }
      ]);
    });

    it('should sum to 100 percent', () => {
      const totalPercentage = defaultDistributionGroups.reduce(
        (sum, group) => sum + group.percentage, 
        0
      );
      expect(totalPercentage).toBe(100);
    });

    it('should be compatible with distributionConfigSchema', () => {
      const config = {
        restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
        groups: defaultDistributionGroups.map(group => ({
          group_name: group.group_name,
          percentage: group.percentage
        }))
      };

      expect(() => distributionConfigSchema.parse(config)).not.toThrow();
    });
  });
});