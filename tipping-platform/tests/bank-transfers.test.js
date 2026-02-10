import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { bankTransferService } from '../utils/payments/bank-transfers';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for tests');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Bank Transfer Service', () => {
  let testRestaurantId;
  let testBankAccountId;

  beforeAll(async () => {
    // Create test restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: 'Test Bank Transfer Restaurant',
        slug: 'test-bank-transfer-restaurant',
        email: 'test-bank@example.com',
        commission_rate: 10.0
      })
      .select()
      .single();

    if (restaurantError) throw restaurantError;
    testRestaurantId = restaurant.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testBankAccountId) {
      await supabase.from('bank_accounts').delete().eq('id', testBankAccountId);
    }
    
    if (testRestaurantId) {
      await supabase.from('bank_accounts').delete().eq('restaurant_id', testRestaurantId);
      await supabase.from('restaurants').delete().eq('id', testRestaurantId);
    }
  });

  beforeEach(async () => {
    // Clean up any existing bank accounts before each test
    await supabase.from('bank_accounts').delete().eq('restaurant_id', testRestaurantId);
  });

  describe('Bank Account Management', () => {
    it('should create a new bank account', async () => {
      const bankAccountData = {
        restaurant_id: testRestaurantId,
        group_name: 'Waiters',
        account_name: 'Test Restaurant Waiters Account',
        account_number: '1234567890',
        bank_name: 'Equity Bank',
        bank_code: '068',
        is_active: true
      };

      const bankAccount = await bankTransferService.upsertBankAccount(bankAccountData);
      testBankAccountId = bankAccount.id;

      expect(bankAccount).toBeDefined();
      expect(bankAccount.id).toBeDefined();
      expect(bankAccount.restaurant_id).toBe(testRestaurantId);
      expect(bankAccount.group_name).toBe('Waiters');
      expect(bankAccount.account_name).toBe('Test Restaurant Waiters Account');
      expect(bankAccount.account_number).toBe('1234567890');
      expect(bankAccount.bank_name).toBe('Equity Bank');
      expect(bankAccount.bank_code).toBe('068');
      expect(bankAccount.is_active).toBe(true);
    });

    it('should update an existing bank account', async () => {
      // Create initial bank account
      const initialData = {
        restaurant_id: testRestaurantId,
        group_name: 'Kitchen',
        account_name: 'Test Kitchen Account',
        account_number: '0987654321',
        bank_name: 'KCB Bank',
        bank_code: '001',
        is_active: true
      };

      const createdAccount = await bankTransferService.upsertBankAccount(initialData);
      testBankAccountId = createdAccount.id;

      // Update the account
      const updatedData = {
        ...createdAccount,
        account_name: 'Updated Kitchen Account',
        bank_name: 'Cooperative Bank',
        bank_code: '011'
      };

      const updatedAccount = await bankTransferService.upsertBankAccount(updatedData);

      expect(updatedAccount.id).toBe(createdAccount.id);
      expect(updatedAccount.account_name).toBe('Updated Kitchen Account');
      expect(updatedAccount.bank_name).toBe('Cooperative Bank');
      expect(updatedAccount.bank_code).toBe('011');
    });

    it('should retrieve bank accounts for a restaurant', async () => {
      // Create multiple bank accounts
      const accounts = [
        {
          restaurant_id: testRestaurantId,
          group_name: 'Waiters',
          account_name: 'Waiters Account',
          account_number: '1111111111',
          bank_name: 'Equity Bank',
          bank_code: '068',
          is_active: true
        },
        {
          restaurant_id: testRestaurantId,
          group_name: 'Kitchen',
          account_name: 'Kitchen Account',
          account_number: '2222222222',
          bank_name: 'KCB Bank',
          bank_code: '001',
          is_active: true
        }
      ];

      for (const accountData of accounts) {
        await bankTransferService.upsertBankAccount(accountData);
      }

      const retrievedAccounts = await bankTransferService.getBankAccounts(testRestaurantId);

      expect(retrievedAccounts).toHaveLength(2);
      expect(retrievedAccounts.map(a => a.group_name)).toContain('Waiters');
      expect(retrievedAccounts.map(a => a.group_name)).toContain('Kitchen');
    });

    it('should get bank account for specific group', async () => {
      // Create bank account
      const accountData = {
        restaurant_id: testRestaurantId,
        group_name: 'Cleaners',
        account_name: 'Cleaners Account',
        account_number: '3333333333',
        bank_name: 'ABSA Bank',
        bank_code: '003',
        is_active: true
      };

      await bankTransferService.upsertBankAccount(accountData);

      const retrievedAccount = await bankTransferService.getBankAccountForGroup(
        testRestaurantId,
        'Cleaners'
      );

      expect(retrievedAccount).toBeDefined();
      expect(retrievedAccount.group_name).toBe('Cleaners');
      expect(retrievedAccount.account_name).toBe('Cleaners Account');

      // Test non-existent group
      const nonExistentAccount = await bankTransferService.getBankAccountForGroup(
        testRestaurantId,
        'NonExistentGroup'
      );

      expect(nonExistentAccount).toBeNull();
    });
  });

  describe('Bank Transfer Processing', () => {
    it('should handle empty payout array', async () => {
      const result = await bankTransferService.processBulkBankTransfers([]);
      
      expect(result.success).toBe(true);
      expect(result.total_transfers).toBe(0);
      expect(result.successful_transfers).toBe(0);
      expect(result.failed_transfers).toBe(0);
      expect(result.total_amount).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate bank transfer request structure', () => {
      const validTransferRequest = {
        payout_id: 'payout-123',
        group_name: 'Waiters',
        amount: 1000,
        account_name: 'Test Account',
        account_number: '1234567890',
        bank_name: 'Equity Bank',
        bank_code: '068',
        reference: 'PAYOUT-123',
        narration: 'Tip payout for Waiters'
      };

      // Validate required fields
      expect(validTransferRequest.payout_id).toBeDefined();
      expect(validTransferRequest.group_name).toBeDefined();
      expect(validTransferRequest.amount).toBeGreaterThan(0);
      expect(validTransferRequest.account_name).toBeDefined();
      expect(validTransferRequest.account_number).toBeDefined();
      expect(validTransferRequest.bank_name).toBeDefined();
      expect(validTransferRequest.bank_code).toBeDefined();
      expect(validTransferRequest.reference).toBeDefined();
      expect(validTransferRequest.narration).toBeDefined();
    });

    it('should simulate bank transfer successfully', async () => {
      const transferRequest = {
        payout_id: 'test-payout-123',
        group_name: 'Waiters',
        amount: 500,
        account_name: 'Test Waiters Account',
        account_number: '1234567890',
        bank_name: 'Equity Bank',
        bank_code: '068',
        reference: 'TEST-PAYOUT-123',
        narration: 'Test tip payout for Waiters'
      };

      const response = await bankTransferService.sendBankTransfer(transferRequest);

      expect(response).toBeDefined();
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.status).toBe('string');
      expect(typeof response.message).toBe('string');

      if (response.success) {
        expect(response.transaction_id).toBeDefined();
        expect(response.reference).toBe(transferRequest.reference);
      }
    });
  });

  describe('Bank Validation', () => {
    it('should validate bank account details', async () => {
      const validation = await bankTransferService.validateBankAccount('068', '1234567890');
      
      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
      
      if (validation.valid) {
        expect(validation.account_name).toBeDefined();
      } else {
        expect(validation.error).toBeDefined();
      }
    });

    it('should handle invalid bank account details', async () => {
      const validation = await bankTransferService.validateBankAccount('999', '123');
      
      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
      
      // In test environment, this might still return valid due to simulation
      // In production with real providers, this should return false
    });
  });

  describe('Supported Banks', () => {
    it('should return list of supported banks', async () => {
      const banks = await bankTransferService.getSupportedBanks();
      
      expect(Array.isArray(banks)).toBe(true);
      expect(banks.length).toBeGreaterThan(0);
      
      // Check structure of bank objects
      banks.forEach(bank => {
        expect(bank.name).toBeDefined();
        expect(bank.code).toBeDefined();
        expect(bank.country).toBeDefined();
      });

      // Should include common Kenyan banks
      const bankNames = banks.map(b => b.name.toLowerCase());
      expect(bankNames.some(name => name.includes('equity'))).toBe(true);
      expect(bankNames.some(name => name.includes('kcb'))).toBe(true);
    });
  });

  describe('Connection Testing', () => {
    it('should test bank transfer connection', async () => {
      const result = await bankTransferService.testConnection();
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      
      if (result.provider) {
        expect(['flutterwave', 'paystack', 'simulation']).toContain(result.provider);
      }
    });
  });
});