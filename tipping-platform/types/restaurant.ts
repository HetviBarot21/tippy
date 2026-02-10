import { z } from 'zod';
import { Tables, TablesInsert, TablesUpdate } from '../types_db';
import { uuidSchema, emailSchema, slugSchema, commissionRateSchema, phoneNumberSchema } from './common';

// Database types
export type Restaurant = Tables<'restaurants'>;
export type RestaurantInsert = TablesInsert<'restaurants'>;
export type RestaurantUpdate = TablesUpdate<'restaurants'>;

// Core Restaurant interface
export interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone_number: string | null;
  address: string | null;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Validation schemas
export const createRestaurantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema,
  email: emailSchema,
  phone_number: phoneNumberSchema.optional(),
  address: z.string().max(500).optional(),
  commission_rate: commissionRateSchema.default(10),
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: emailSchema.optional(),
  phone_number: phoneNumberSchema.optional(),
  address: z.string().max(500).optional(),
  commission_rate: commissionRateSchema.optional(),
  is_active: z.boolean().optional(),
});

export const restaurantParamsSchema = z.object({
  id: uuidSchema,
});

// API request/response types
export type CreateRestaurantRequest = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantRequest = z.infer<typeof updateRestaurantSchema>;
export type RestaurantParams = z.infer<typeof restaurantParamsSchema>;

// Extended restaurant data with relationships
export interface RestaurantWithStats extends RestaurantData {
  total_tips: number;
  total_waiters: number;
  total_tables: number;
  monthly_tips: number;
}