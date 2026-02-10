import { z } from 'zod';
import { Tables, TablesInsert, TablesUpdate } from '../types_db';
import { uuidSchema, tipAmountSchema, phoneNumberSchema, PaymentMethod, PaymentStatus, TipType } from './common';

// Database types
export type Tip = Tables<'tips'>;
export type TipInsert = TablesInsert<'tips'>;
export type TipUpdate = TablesUpdate<'tips'>;

// Core Tip interface
export interface TipData {
  id: string;
  restaurant_id: string;
  waiter_id: string | null;
  table_id: string | null;
  amount: number;
  commission_amount: number;
  net_amount: number;
  tip_type: TipType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_id: string | null;
  customer_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Validation schemas
export const createTipSchema = z.object({
  restaurant_id: uuidSchema,
  waiter_id: uuidSchema.optional(),
  table_id: uuidSchema.optional(),
  amount: tipAmountSchema,
  tip_type: z.enum(['waiter', 'restaurant']),
  payment_method: z.enum(['mpesa', 'card']),
  customer_phone: phoneNumberSchema.optional(),
  notes: z.string().max(500).optional(),
});

export const updateTipSchema = z.object({
  payment_status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  transaction_id: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const tipParamsSchema = z.object({
  id: uuidSchema,
});

export const tipQuerySchema = z.object({
  restaurant_id: uuidSchema.optional(),
  waiter_id: uuidSchema.optional(),
  table_id: uuidSchema.optional(),
  tip_type: z.enum(['waiter', 'restaurant']).optional(),
  payment_method: z.enum(['mpesa', 'card']).optional(),
  payment_status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

// Payment initiation schemas
export const mpesaPaymentSchema = z.object({
  tip_id: uuidSchema,
  phone_number: phoneNumberSchema,
  amount: tipAmountSchema,
});

export const cardPaymentSchema = z.object({
  tip_id: uuidSchema,
  amount: tipAmountSchema,
  return_url: z.string().url(),
});

// Webhook schemas
export const paymentWebhookSchema = z.object({
  transaction_id: z.string(),
  tip_id: uuidSchema,
  status: z.enum(['completed', 'failed']),
  amount: z.number(),
  payment_method: z.enum(['mpesa', 'card']),
  metadata: z.record(z.any()).optional(),
});

// API request/response types
export type CreateTipRequest = z.infer<typeof createTipSchema>;
export type UpdateTipRequest = z.infer<typeof updateTipSchema>;
export type TipParams = z.infer<typeof tipParamsSchema>;
export type TipQuery = z.infer<typeof tipQuerySchema>;
export type MpesaPaymentRequest = z.infer<typeof mpesaPaymentSchema>;
export type CardPaymentRequest = z.infer<typeof cardPaymentSchema>;
export type PaymentWebhookData = z.infer<typeof paymentWebhookSchema>;

// Extended tip data with relationships
export interface TipWithDetails extends TipData {
  waiter?: {
    id: string;
    name: string;
  };
  table?: {
    id: string;
    table_number: string;
  };
  restaurant?: {
    id: string;
    name: string;
  };
}

// Tip analytics interfaces
export interface TipAnalytics {
  total_amount: number;
  total_tips: number;
  average_tip: number;
  commission_earned: number;
  net_amount: number;
  by_payment_method: {
    mpesa: number;
    card: number;
  };
  by_tip_type: {
    waiter: number;
    restaurant: number;
  };
}

export interface MonthlyTipSummary {
  month: string;
  total_amount: number;
  tip_count: number;
  commission_amount: number;
  net_amount: number;
}