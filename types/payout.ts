import { z } from 'zod';
import { Tables, TablesInsert, TablesUpdate } from '../types_db';
import { uuidSchema, monthSchema, phoneNumberSchema, PayoutStatus, PayoutType } from './common';

// Database types
export type Payout = Tables<'payouts'>;
export type PayoutInsert = TablesInsert<'payouts'>;
export type PayoutUpdate = TablesUpdate<'payouts'>;

// Core Payout interface
export interface PayoutData {
  id: string;
  restaurant_id: string;
  waiter_id: string | null;
  payout_type: PayoutType;
  group_name: string | null;
  amount: number;
  payout_month: string;
  status: PayoutStatus;
  recipient_phone: string | null;
  recipient_account: string | null;
  transaction_reference: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Validation schemas
export const createPayoutSchema = z.object({
  restaurant_id: uuidSchema,
  waiter_id: uuidSchema.optional(),
  payout_type: z.enum(['waiter', 'group']),
  group_name: z.string().max(100).optional(),
  amount: z.number().min(100), // Minimum payout threshold of 100 KES
  payout_month: monthSchema,
  recipient_phone: phoneNumberSchema.optional(),
  recipient_account: z.string().max(100).optional(),
});

export const updatePayoutSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  transaction_reference: z.string().optional(),
  processed_at: z.string().datetime().optional(),
});

export const payoutParamsSchema = z.object({
  id: uuidSchema,
});

export const payoutQuerySchema = z.object({
  restaurant_id: uuidSchema.optional(),
  waiter_id: uuidSchema.optional(),
  payout_type: z.enum(['waiter', 'group']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  payout_month: monthSchema.optional(),
  group_name: z.string().optional(),
});

// Payout calculation schemas
export const calculatePayoutSchema = z.object({
  restaurant_id: uuidSchema,
  month: monthSchema,
});

export const processPayoutSchema = z.object({
  payout_ids: z.array(uuidSchema),
});

// API request/response types
export type CreatePayoutRequest = z.infer<typeof createPayoutSchema>;
export type UpdatePayoutRequest = z.infer<typeof updatePayoutSchema>;
export type PayoutParams = z.infer<typeof payoutParamsSchema>;
export type PayoutQuery = z.infer<typeof payoutQuerySchema>;
export type CalculatePayoutRequest = z.infer<typeof calculatePayoutSchema>;
export type ProcessPayoutRequest = z.infer<typeof processPayoutSchema>;

// Extended payout data with relationships
export interface PayoutWithDetails extends PayoutData {
  waiter?: {
    id: string;
    name: string;
    phone_number: string;
  };
  restaurant?: {
    id: string;
    name: string;
  };
}

// Payout calculation interfaces
export interface PayoutCalculation {
  waiter_payouts: WaiterPayoutCalculation[];
  group_payouts: GroupPayoutCalculation[];
  total_amount: number;
  commission_deducted: number;
}

export interface WaiterPayoutCalculation {
  waiter_id: string;
  waiter_name: string;
  phone_number: string;
  total_tips: number;
  commission_amount: number;
  net_amount: number;
  tip_count: number;
  meets_minimum: boolean; // Whether amount meets 100 KES minimum
}

export interface GroupPayoutCalculation {
  group_name: string;
  percentage: number;
  total_tips: number;
  commission_amount: number;
  net_amount: number;
  recipient_account: string | null;
  meets_minimum: boolean;
}

// Payout notification interfaces
export interface PayoutNotification {
  recipient_type: 'waiter' | 'restaurant';
  recipient_id: string;
  amount: number;
  payout_date: string;
  notification_type: 'upcoming' | 'processed' | 'failed';
  message: string;
}

// Monthly payout summary
export interface MonthlyPayoutSummary {
  month: string;
  total_payouts: number;
  total_amount: number;
  waiter_payouts: number;
  group_payouts: number;
  pending_payouts: number;
  completed_payouts: number;
  failed_payouts: number;
}