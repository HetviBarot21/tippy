import { z } from 'zod';
import { Tables, TablesInsert, TablesUpdate } from '../types_db';
import { uuidSchema, percentageSchema } from './common';

// Database types
export type DistributionGroup = Tables<'distribution_groups'>;
export type DistributionGroupInsert = TablesInsert<'distribution_groups'>;
export type DistributionGroupUpdate = TablesUpdate<'distribution_groups'>;

// Core DistributionGroup interface
export interface DistributionGroupData {
  id: string;
  restaurant_id: string;
  group_name: string;
  percentage: number;
  created_at: string;
  updated_at: string;
}

// Validation schemas
export const createDistributionGroupSchema = z.object({
  restaurant_id: uuidSchema,
  group_name: z.string().min(1).max(100),
  percentage: percentageSchema,
});

export const updateDistributionGroupSchema = z.object({
  group_name: z.string().min(1).max(100).optional(),
  percentage: percentageSchema.optional(),
});

export const distributionGroupParamsSchema = z.object({
  id: uuidSchema,
});

export const distributionGroupQuerySchema = z.object({
  restaurant_id: uuidSchema.optional(),
});

// Distribution configuration schema with validation
export const distributionConfigSchema = z.object({
  restaurant_id: uuidSchema,
  groups: z.array(z.object({
    group_name: z.string().min(1).max(100),
    percentage: percentageSchema,
  })).min(1),
}).refine((data) => {
  const totalPercentage = data.groups.reduce((sum, group) => sum + group.percentage, 0);
  return Math.abs(totalPercentage - 100) < 0.01; // Allow for small floating point errors
}, {
  message: 'Distribution group percentages must sum to exactly 100%',
  path: ['groups'],
});

// Default distribution groups as per requirements
export const defaultDistributionGroups = [
  { group_name: 'cleaners', percentage: 10 },
  { group_name: 'waiters', percentage: 30 },
  { group_name: 'admin', percentage: 40 },
  { group_name: 'owners', percentage: 20 },
] as const;

// API request/response types
export type CreateDistributionGroupRequest = z.infer<typeof createDistributionGroupSchema>;
export type UpdateDistributionGroupRequest = z.infer<typeof updateDistributionGroupSchema>;
export type DistributionGroupParams = z.infer<typeof distributionGroupParamsSchema>;
export type DistributionGroupQuery = z.infer<typeof distributionGroupQuerySchema>;
export type DistributionConfigRequest = z.infer<typeof distributionConfigSchema>;

// Distribution calculation interfaces
export interface DistributionCalculation {
  group_name: string;
  percentage: number;
  amount: number;
  net_amount: number; // After commission deduction
}

export interface RestaurantDistribution {
  restaurant_id: string;
  total_amount: number;
  commission_amount: number;
  distributions: DistributionCalculation[];
}

// Distribution group with statistics
export interface DistributionGroupWithStats extends DistributionGroupData {
  total_distributed: number;
  monthly_distributed: number;
  distribution_count: number;
}