import { z } from 'zod';
import { Tables, TablesInsert, TablesUpdate } from '../types_db';
import { uuidSchema } from './common';

// Database types
export type QRCode = Tables<'qr_codes'>;
export type QRCodeInsert = TablesInsert<'qr_codes'>;
export type QRCodeUpdate = TablesUpdate<'qr_codes'>;

// Core QRCode interface
export interface QRCodeData {
  id: string;
  restaurant_id: string;
  table_number: string;
  table_name: string | null;
  qr_data: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Validation schemas
export const createQRCodeSchema = z.object({
  restaurant_id: uuidSchema,
  table_number: z.string().min(1).max(50),
  table_name: z.string().max(100).optional(),
});

export const updateQRCodeSchema = z.object({
  table_number: z.string().min(1).max(50).optional(),
  table_name: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

export const qrCodeParamsSchema = z.object({
  id: uuidSchema,
});

export const qrCodeQuerySchema = z.object({
  restaurant_id: uuidSchema.optional(),
  is_active: z.boolean().optional(),
  table_number: z.string().optional(),
});

// QR code generation schema
export const generateQRCodeSchema = z.object({
  restaurant_id: uuidSchema,
  table_number: z.string().min(1).max(50),
  table_name: z.string().max(100).optional(),
});

// QR code scanning schema
export const qrCodeScanSchema = z.object({
  restaurant_id: uuidSchema,
  table_id: uuidSchema,
});

// API request/response types
export type CreateQRCodeRequest = z.infer<typeof createQRCodeSchema>;
export type UpdateQRCodeRequest = z.infer<typeof updateQRCodeSchema>;
export type QRCodeParams = z.infer<typeof qrCodeParamsSchema>;
export type QRCodeQuery = z.infer<typeof qrCodeQuerySchema>;
export type GenerateQRCodeRequest = z.infer<typeof generateQRCodeSchema>;
export type QRCodeScanData = z.infer<typeof qrCodeScanSchema>;

// Extended QR code data with relationships
export interface QRCodeWithStats extends QRCodeData {
  total_tips: number;
  monthly_tips: number;
  last_tip_date: string | null;
}

// QR code display data for tipping interface
export interface QRCodeDisplayData {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  table_number: string;
  table_name: string | null;
  is_active: boolean;
}

// QR code generation response
export interface QRCodeGenerationResult {
  id: string;
  qr_data: string;
  qr_code_url: string; // Base64 data URL for the QR code image
  table_number: string;
  table_name: string | null;
}