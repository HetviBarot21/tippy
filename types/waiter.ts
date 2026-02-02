import { z } from 'zod';
import { Tables, TablesInsert, TablesUpdate } from '../types_db';
import { uuidSchema, emailSchema, phoneNumberSchema } from './common';

// Database types
export type Waiter = Tables<'waiters'>;
export type WaiterInsert = TablesInsert<'waiters'>;
export type WaiterUpdate = TablesUpdate<'waiters'>;

// Core Waiter interface
export interface WaiterData {
  id: string;
  restaurant_id: string;
  name: string;
  phone_number: string;
  email: string | null;
  profile_photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Validation schemas
export const createWaiterSchema = z.object({
  restaurant_id: uuidSchema,
  name: z.string().min(1).max(255),
  phone_number: phoneNumberSchema,
  email: emailSchema.optional(),
  profile_photo_url: z.string().url().optional(),
});

export const updateWaiterSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone_number: phoneNumberSchema.optional(),
  email: emailSchema.optional(),
  profile_photo_url: z.string().url().optional(),
  is_active: z.boolean().optional(),
});

export const waiterParamsSchema = z.object({
  id: uuidSchema,
});

export const waiterQuerySchema = z.object({
  restaurant_id: uuidSchema.optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
});

// API request/response types
export type CreateWaiterRequest = z.infer<typeof createWaiterSchema>;
export type UpdateWaiterRequest = z.infer<typeof updateWaiterSchema>;
export type WaiterParams = z.infer<typeof waiterParamsSchema>;
export type WaiterQuery = z.infer<typeof waiterQuerySchema>;

// Extended waiter data with relationships
export interface WaiterWithStats extends WaiterData {
  total_tips: number;
  monthly_tips: number;
  tip_count: number;
}

// Waiter selection for tipping interface
export interface WaiterSelection {
  id: string;
  name: string;
  profile_photo_url: string | null;
}