import { z } from 'zod';
import { Database } from '../types_db';

// Common types and enums from database
export type PaymentMethod = Database['public']['Enums']['payment_method'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type PayoutStatus = Database['public']['Enums']['payout_status'];
export type PayoutType = Database['public']['Enums']['payout_type'];
export type TipType = Database['public']['Enums']['tip_type'];

// Common validation schemas
export const uuidSchema = z.string().uuid();
export const phoneNumberSchema = z.string().regex(
  /^\+254[17]\d{8}$/,
  'Phone number must be a valid Kenyan mobile number (e.g., +254712345678)'
);
export const emailSchema = z.string().email();
export const slugSchema = z.string().min(1).max(100).regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Slug must contain only lowercase letters, numbers, and hyphens'
);

// Amount validation for Kenyan Shillings (10 KES to 10,000 KES)
export const tipAmountSchema = z.number().min(10).max(10000);
export const commissionRateSchema = z.number().min(0).max(100);
export const percentageSchema = z.number().min(0).max(100);

// Date schemas
export const dateSchema = z.string().datetime();
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format');

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// Response wrapper types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface ApiError {
  success: false;
  message: string;
  code?: string;
  details?: Record<string, any>;
}