/**
 * M-Pesa Service Tests
 * 
 * Tests for M-Pesa payment service functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateMpesaPhoneNumber } from '@/utils/mpesa/service';
import { MpesaClient } from '@/utils/mpesa/client';

describe('M-Pesa Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Phone number validation', () => {
    it('should validate correct Kenyan phone numbers', () => {
      expect(validateMpesaPhoneNumber('+254712345678')).toBe(true);
      expect(validateMpesaPhoneNumber('254712345678')).toBe(true);
      expect(validateMpesaPhoneNumber('0712345678')).toBe(true);
      expect(validateMpesaPhoneNumber('712345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validateMpesaPhoneNumber('12345678')).toBe(false); // Too short
      expect(validateMpesaPhoneNumber('+1234567890')).toBe(false);
      expect(validateMpesaPhoneNumber('invalid')).toBe(false);
      expect(validateMpesaPhoneNumber('')).toBe(false);
    });
  });

  describe('MpesaClient static methods', () => {
    it('should validate phone numbers correctly', () => {
      expect(MpesaClient.validatePhoneNumber('254712345678')).toBe(true);
      expect(MpesaClient.validatePhoneNumber('0712345678')).toBe(true);
      expect(MpesaClient.validatePhoneNumber('712345678')).toBe(true);
      expect(MpesaClient.validatePhoneNumber('invalid')).toBe(false);
      expect(MpesaClient.validatePhoneNumber('12345678')).toBe(false); // Too short
    });
  });
});