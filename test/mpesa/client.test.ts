/**
 * M-Pesa Client Tests
 * 
 * Tests for M-Pesa Daraja API client functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MpesaClient } from '@/utils/mpesa/client';
import { formatPhoneNumber, generatePassword, generateTimestamp } from '@/utils/mpesa/config';

// Mock fetch globally
global.fetch = vi.fn();

describe('MpesaClient', () => {
  let client: MpesaClient;
  
  beforeEach(() => {
    client = new MpesaClient();
    vi.clearAllMocks();
  });

  describe('Phone number validation', () => {
    it('should validate correct Kenyan phone numbers', () => {
      expect(MpesaClient.validatePhoneNumber('+254712345678')).toBe(true);
      expect(MpesaClient.validatePhoneNumber('254712345678')).toBe(true);
      expect(MpesaClient.validatePhoneNumber('0712345678')).toBe(true);
      expect(MpesaClient.validatePhoneNumber('712345678')).toBe(true);
      expect(MpesaClient.validatePhoneNumber('+254112345678')).toBe(true);
      expect(MpesaClient.validatePhoneNumber('0112345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(MpesaClient.validatePhoneNumber('12345678')).toBe(false); // Too short
      expect(MpesaClient.validatePhoneNumber('+1234567890')).toBe(false); // Wrong country code
      expect(MpesaClient.validatePhoneNumber('invalid')).toBe(false);
      expect(MpesaClient.validatePhoneNumber('')).toBe(false);
      expect(MpesaClient.validatePhoneNumber('254812345678')).toBe(false); // Invalid prefix (8)
    });
  });

  describe('Phone number formatting', () => {
    it('should format phone numbers correctly', () => {
      expect(formatPhoneNumber('+254712345678')).toBe('254712345678');
      expect(formatPhoneNumber('254712345678')).toBe('254712345678');
      expect(formatPhoneNumber('0712345678')).toBe('254712345678');
      expect(formatPhoneNumber('712345678')).toBe('254712345678');
    });

    it('should throw error for invalid formats', () => {
      expect(() => formatPhoneNumber('12345678')).toThrow('Invalid phone number format'); // Too short
      expect(() => formatPhoneNumber('invalid')).toThrow('Invalid phone number format');
      expect(() => formatPhoneNumber('254812345678')).toThrow('Invalid phone number format'); // Invalid prefix
    });
  });

  describe('Timestamp generation', () => {
    it('should generate timestamp in correct format', () => {
      const timestamp = generateTimestamp();
      expect(timestamp).toMatch(/^\d{14}$/);
      expect(timestamp.length).toBe(14);
    });
  });

  describe('Password generation', () => {
    it('should generate base64 encoded password', () => {
      const businessShortCode = '174379';
      const passkey = 'test_passkey';
      const timestamp = '20240203120000';
      
      const password = generatePassword(businessShortCode, passkey, timestamp);
      expect(password).toBe(Buffer.from(businessShortCode + passkey + timestamp).toString('base64'));
    });
  });

  describe('STK Push initiation', () => {
    it('should successfully initiate STK Push', async () => {
      // Mock successful auth response
      const mockAuthResponse = {
        access_token: 'test_token',
        expires_in: '3599'
      };
      
      // Mock successful STK Push response
      const mockSTKResponse = {
        MerchantRequestID: 'test_merchant_id',
        CheckoutRequestID: 'test_checkout_id',
        ResponseCode: '0',
        ResponseDescription: 'Success',
        CustomerMessage: 'Success. Request accepted for processing'
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSTKResponse)
        });

      const result = await client.initiateSTKPush({
        phoneNumber: '254712345678',
        amount: 100,
        accountReference: 'TIP-12345',
        transactionDesc: 'Test tip payment'
      });

      expect(result).toEqual(mockSTKResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle authentication failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(client.initiateSTKPush({
        phoneNumber: '254712345678',
        amount: 100,
        accountReference: 'TIP-12345',
        transactionDesc: 'Test tip payment'
      })).rejects.toThrow('Failed to authenticate with M-Pesa API');
    });

    it('should handle STK Push failure', async () => {
      const mockAuthResponse = {
        access_token: 'test_token',
        expires_in: '3599'
      };

      const mockSTKErrorResponse = {
        ResponseCode: '1',
        ResponseDescription: 'Invalid phone number',
        CustomerMessage: 'Invalid phone number'
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSTKErrorResponse)
        });

      await expect(client.initiateSTKPush({
        phoneNumber: '254712345678',
        amount: 100,
        accountReference: 'TIP-12345',
        transactionDesc: 'Test tip payment'
      })).rejects.toThrow('M-Pesa STK Push failed: Invalid phone number');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.initiateSTKPush({
        phoneNumber: '254712345678',
        amount: 100,
        accountReference: 'TIP-12345',
        transactionDesc: 'Test tip payment'
      })).rejects.toThrow('Failed to authenticate with M-Pesa API');
    });
  });

  describe('STK Push status query', () => {
    it('should successfully query STK Push status', async () => {
      const mockAuthResponse = {
        access_token: 'test_token',
        expires_in: '3599'
      };

      const mockStatusResponse = {
        ResponseCode: '0',
        ResponseDescription: 'The service request has been accepted successfully',
        MerchantRequestID: 'test_merchant_id',
        CheckoutRequestID: 'test_checkout_id',
        ResultCode: '0',
        ResultDesc: 'The service request is processed successfully.'
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatusResponse)
        });

      const result = await client.querySTKPushStatus('test_checkout_id');
      expect(result).toEqual(mockStatusResponse);
    });

    it('should handle query failure', async () => {
      const mockAuthResponse = {
        access_token: 'test_token',
        expires_in: '3599'
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse)
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request'
        });

      await expect(client.querySTKPushStatus('invalid_checkout_id'))
        .rejects.toThrow('M-Pesa query failed: 400 Bad Request');
    });
  });
});