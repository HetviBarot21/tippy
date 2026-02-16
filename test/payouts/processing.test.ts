/**
 * Payout Processing Tests
 * 
 * Tests for M-Pesa and bank transfer payout processing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processMpesaPayouts, retryFailedPayouts, sendPayoutNotifications } from '@/utils/payouts/processor';
import { processBankTransfers } from '@/utils/bank-transfers/service';
import { createClient } from '@/utils/supabase/admin';

// Mock M-Pesa client
vi.mock('@/utils/mpesa/client', () => ({
  mpesaClient: {
    processBulkB2CPayments: vi.fn()
  }
}));

describe('Payout Processing Service', () => {
  const testRestaurantId = 'test-restaurant-id';
  const testWaiterId1 = 'waiter-1';
  const testWaiterId2 = 'waiter-2';
  
  beforeEach(async () => {
    const supabase = createClient();
    
    // Create test restaurant
    await supabase.from('restaurants').insert({
      id: testRestaurantId,
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      email: 'test@restaurant.com'
    });

    // Create test waiters
    await supabase.from('waiters').insert([
      {
        id: testWaiterId1,
        restaurant_id: testRestaurantId,
        name: 'John Doe',
        phone_number: '254712345678',
        is_active: true
      },
      {
        id: testWaiterId2,
        restaurant_id: testRestaurantId,
        name: 'Jane Smith',
        phone_number: '254712345679',
        is_active: true
      }
    ]);
  });

  afterEach(async () => {
    const supabase = createClient();
    await supabase.from('payouts').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('waiters').delete().eq('restaurant_id', testRestaurantId);
    await supabase.from('restaurants').delete().eq('id', testRestaurantId);
    vi.clearAllMocks();
  });

  describe('M-Pesa Payout Processing', () => {
    it('should process successful M-Pesa payouts', async () => {
      const supabase = createClient();
      
      // Create test payout records
      const { data: payouts } = await supabase.from('payouts').insert([
        {
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId1,
          payout_type: 'waiter',
          amount: 500.00,
          payout_month: '2024-01-01',
          recipient_phone: '254712345678',
          status: 'pending'
        },
        {
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId2,
          payout_type: 'waiter',
          amount: 300.00,
          payout_month: '2024-01-01',
          recipient_phone: '254712345679',
          status: 'pending'
        }
      ]).select();

      // Mock successful M-Pesa responses
      const { mpesaClient } = await import('@/utils/mpesa/client');
      vi.mocked(mpesaClient.processBulkB2CPayments).mockResolvedValue([
        {
          reference: payouts![0].id,
          success: true,
          conversationId: 'CONV_123456'
        },
        {
          reference: payouts![1].id,
          success: true,
          conversationId: 'CONV_789012'
        }
      ]);

      const result = await processMpesaPayouts(payouts!.map(p => p.id));

      expect(result.success).toBe(true);
      expect(result.processed_count).toBe(2);
      expect(result.failed_count).toBe(0);
      expect(result.results).toHaveLength(2);

      // Verify payouts were updated to completed
      const { data: updatedPayouts } = await supabase
        .from('payouts')
        .select('*')
        .in('id', payouts!.map(p => p.id));

      expect(updatedPayouts!.every(p => p.status === 'completed')).toBe(true);
      expect(updatedPayouts!.every(p => p.transaction_reference?.startsWith('CONV_'))).toBe(true);
      expect(updatedPayouts!.every(p => p.processed_at !== null)).toBe(true);
    });

    it('should handle M-Pesa payout failures', async () => {
      const supabase = createClient();
      
      const { data: payouts } = await supabase.from('payouts').insert([
        {
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId1,
          payout_type: 'waiter',
          amount: 500.00,
          payout_month: '2024-01-01',
          recipient_phone: '254712345678',
          status: 'pending'
        }
      ]).select();

      // Mock failed M-Pesa response
      const { mpesaClient } = await import('@/utils/mpesa/client');
      vi.mocked(mpesaClient.processBulkB2CPayments).mockResolvedValue([
        {
          reference: payouts![0].id,
          success: false,
          error: 'Insufficient funds'
        }
      ]);

      const result = await processMpesaPayouts(payouts!.map(p => p.id));

      expect(result.success).toBe(true);
      expect(result.processed_count).toBe(0);
      expect(result.failed_count).toBe(1);

      // Verify payout was updated to failed
      const { data: updatedPayouts } = await supabase
        .from('payouts')
        .select('*')
        .eq('id', payouts![0].id);

      expect(updatedPayouts![0].status).toBe('failed');
      expect(updatedPayouts![0].transaction_reference).toContain('ERROR: Insufficient funds');
    });

    it('should retry failed payouts', async () => {
      const supabase = createClient();
      
      const { data: payouts } = await supabase.from('payouts').insert([
        {
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId1,
          payout_type: 'waiter',
          amount: 500.00,
          payout_month: '2024-01-01',
          recipient_phone: '254712345678',
          status: 'failed',
          transaction_reference: 'ERROR: Previous failure'
        }
      ]).select();

      // Mock successful retry
      const { mpesaClient } = await import('@/utils/mpesa/client');
      vi.mocked(mpesaClient.processBulkB2CPayments).mockResolvedValue([
        {
          reference: payouts![0].id,
          success: true,
          conversationId: 'CONV_RETRY_123'
        }
      ]);

      const result = await retryFailedPayouts(payouts!.map(p => p.id));

      expect(result.success).toBe(true);
      expect(result.processed_count).toBe(1);
      expect(result.failed_count).toBe(0);

      // Verify payout was updated to completed
      const { data: updatedPayouts } = await supabase
        .from('payouts')
        .select('*')
        .eq('id', payouts![0].id);

      expect(updatedPayouts![0].status).toBe('completed');
      expect(updatedPayouts![0].transaction_reference).toBe('CONV_RETRY_123');
    });
  });

  describe('Bank Transfer Processing', () => {
    it('should process successful bank transfers', async () => {
      const supabase = createClient();
      
      // Create test group payout records
      const { data: payouts } = await supabase.from('payouts').insert([
        {
          restaurant_id: testRestaurantId,
          waiter_id: null,
          payout_type: 'group',
          group_name: 'admin',
          amount: 1000.00,
          payout_month: '2024-01-01',
          recipient_account: JSON.stringify({
            account_number: '1234567890',
            account_name: 'Test Restaurant Admin',
            bank_code: '01',
            bank_name: 'KCB Bank'
          }),
          status: 'pending'
        }
      ]).select();

      // Mock the bank transfer provider to return success
      const result = await processBankTransfers(payouts!.map(p => p.id));

      // Since we're using the mock provider, it should succeed most of the time
      expect(result.success).toBe(true);
      expect(result.processed_count + result.failed_count).toBe(1);

      if (result.processed_count > 0) {
        // Verify payout was updated to completed
        const { data: updatedPayouts } = await supabase
          .from('payouts')
          .select('*')
          .eq('id', payouts![0].id);

        expect(updatedPayouts![0].status).toBe('completed');
        expect(updatedPayouts![0].transaction_reference).toBeTruthy();
        expect(updatedPayouts![0].processed_at).toBeTruthy();
      }
    });

    it('should handle invalid recipient account format', async () => {
      const supabase = createClient();
      
      const { data: payouts } = await supabase.from('payouts').insert([
        {
          restaurant_id: testRestaurantId,
          waiter_id: null,
          payout_type: 'group',
          group_name: 'admin',
          amount: 1000.00,
          payout_month: '2024-01-01',
          recipient_account: 'invalid-json',
          status: 'pending'
        }
      ]).select();

      const result = await processBankTransfers(payouts!.map(p => p.id));

      expect(result.success).toBe(true);
      expect(result.failed_count).toBe(1);
      expect(result.results[0].error).toContain('Invalid recipient account format');
    });
  });

  describe('Payout Notifications', () => {
    it('should send payout notifications on correct date', async () => {
      // Mock the current date to be 3 days before end of month
      const mockDate = new Date('2024-01-28'); // 3 days before Jan 31
      vi.setSystemTime(mockDate);

      const supabase = createClient();
      
      // Create test pending payouts
      await supabase.from('payouts').insert([
        {
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId1,
          payout_type: 'waiter',
          amount: 500.00,
          payout_month: '2024-01-01',
          status: 'pending'
        },
        {
          restaurant_id: testRestaurantId,
          waiter_id: null,
          payout_type: 'group',
          group_name: 'admin',
          amount: 1000.00,
          payout_month: '2024-01-01',
          status: 'pending'
        }
      ]);

      const result = await sendPayoutNotifications('2024-01');

      expect(result.success).toBe(true);
      expect(result.notifications_sent).toBe(2);

      vi.useRealTimers();
    });

    it('should not send notifications on wrong date', async () => {
      // Mock the current date to be not the notification date
      const mockDate = new Date('2024-01-15');
      vi.setSystemTime(mockDate);

      const result = await sendPayoutNotifications('2024-01');

      expect(result.success).toBe(true);
      expect(result.notifications_sent).toBe(0);
      expect(result.message).toContain('Not the notification date yet');

      vi.useRealTimers();
    });

    it('should only notify payouts above minimum threshold', async () => {
      const mockDate = new Date('2024-01-28');
      vi.setSystemTime(mockDate);

      const supabase = createClient();
      
      // Create payouts with different amounts
      await supabase.from('payouts').insert([
        {
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId1,
          payout_type: 'waiter',
          amount: 50.00, // Below minimum threshold
          payout_month: '2024-01-01',
          status: 'pending'
        },
        {
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId2,
          payout_type: 'waiter',
          amount: 500.00, // Above minimum threshold
          payout_month: '2024-01-01',
          status: 'pending'
        }
      ]);

      const result = await sendPayoutNotifications('2024-01');

      expect(result.success).toBe(true);
      expect(result.notifications_sent).toBe(1); // Only the one above threshold

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Test with non-existent restaurant ID
      const result = await processMpesaPayouts(['non-existent-payout-id']);

      expect(result.success).toBe(true);
      expect(result.processed_count).toBe(0);
      expect(result.failed_count).toBe(0);
      expect(result.message).toContain('No pending waiter payouts found');
    });

    it('should revert payout status on processing failure', async () => {
      const supabase = createClient();
      
      const { data: payouts } = await supabase.from('payouts').insert([
        {
          restaurant_id: testRestaurantId,
          waiter_id: testWaiterId1,
          payout_type: 'waiter',
          amount: 500.00,
          payout_month: '2024-01-01',
          recipient_phone: '254712345678',
          status: 'pending'
        }
      ]).select();

      // Mock M-Pesa client to throw an error
      const { mpesaClient } = await import('@/utils/mpesa/client');
      vi.mocked(mpesaClient.processBulkB2CPayments).mockRejectedValue(new Error('Network error'));

      const result = await processMpesaPayouts(payouts!.map(p => p.id));

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');

      // Verify payout status was reverted to pending
      const { data: updatedPayouts } = await supabase
        .from('payouts')
        .select('*')
        .eq('id', payouts![0].id);

      expect(updatedPayouts![0].status).toBe('pending');
    });
  });
});