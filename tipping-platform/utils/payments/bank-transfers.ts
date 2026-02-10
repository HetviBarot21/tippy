/**
 * Bank transfer service for restaurant group payouts
 * This service handles bank transfers for distribution group payouts
 */

import { createClient } from '@/utils/supabase/server';
import { Tables, TablesInsert, TablesUpdate } from '@/types_db';

type Restaurant = Tables<'restaurants'>;
type Payout = Tables<'payouts'>;

export interface BankAccount {
  id?: string;
  restaurant_id: string;
  group_name: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
  branch_code?: string;
  swift_code?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BankTransferRequest {
  payout_id: string;
  group_name: string;
  amount: number;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
  reference: string;
  narration: string;
}

export interface BankTransferResponse {
  success: boolean;
  transaction_id?: string;
  reference?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  error?: string;
}

export interface BankTransferResult {
  success: boolean;
  payout_id: string;
  group_name: string;
  amount: number;
  transaction_id?: string;
  reference?: string;
  error?: string;
}

export interface BulkBankTransferResult {
  success: boolean;
  total_transfers: number;
  successful_transfers: number;
  failed_transfers: number;
  total_amount: number;
  results: BankTransferResult[];
  errors: string[];
}

export class BankTransferService {
  private supabase = createClient();

  // Bank transfer providers configuration
  private readonly PROVIDERS = {
    // Flutterwave Bank Transfer API
    flutterwave: {
      baseUrl: process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3',
      secretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
      enabled: !!process.env.FLUTTERWAVE_SECRET_KEY
    },
    // Paystack Transfer API
    paystack: {
      baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
      secretKey: process.env.PAYSTACK_SECRET_KEY || '',
      enabled: !!process.env.PAYSTACK_SECRET_KEY
    }
  };

  constructor() {
    // Check if at least one provider is configured
    const hasProvider = Object.values(this.PROVIDERS).some(provider => provider.enabled);
    if (!hasProvider) {
      console.warn('No bank transfer provider configured. Bank transfers will be simulated.');
    }
  }

  /**
   * Get bank accounts for a restaurant
   */
  async getBankAccounts(restaurantId: string): Promise<BankAccount[]> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('group_name');

    if (error) {
      console.error('Error fetching bank accounts:', error);
      throw new Error('Failed to fetch bank accounts');
    }

    return data || [];
  }

  /**
   * Get bank account for a specific distribution group
   */
  async getBankAccountForGroup(restaurantId: string, groupName: string): Promise<BankAccount | null> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('group_name', groupName)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No bank account found
      }
      console.error('Error fetching bank account:', error);
      throw new Error('Failed to fetch bank account');
    }

    return data;
  }

  /**
   * Create or update bank account for a distribution group
   */
  async upsertBankAccount(bankAccount: BankAccount): Promise<BankAccount> {
    const accountData = {
      restaurant_id: bankAccount.restaurant_id,
      group_name: bankAccount.group_name,
      account_name: bankAccount.account_name,
      account_number: bankAccount.account_number,
      bank_name: bankAccount.bank_name,
      bank_code: bankAccount.bank_code,
      branch_code: bankAccount.branch_code,
      swift_code: bankAccount.swift_code,
      is_active: bankAccount.is_active,
      updated_at: new Date().toISOString()
    };

    if (bankAccount.id) {
      // Update existing account
      const { data, error } = await this.supabase
        .from('bank_accounts')
        .update(accountData)
        .eq('id', bankAccount.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating bank account:', error);
        throw new Error('Failed to update bank account');
      }

      return data;
    } else {
      // Create new account
      const { data, error } = await this.supabase
        .from('bank_accounts')
        .insert({
          ...accountData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating bank account:', error);
        throw new Error('Failed to create bank account');
      }

      return data;
    }
  }

  /**
   * Send bank transfer using Flutterwave
   */
  private async sendFlutterwaveTransfer(request: BankTransferRequest): Promise<BankTransferResponse> {
    try {
      const { flutterwave } = this.PROVIDERS;
      
      if (!flutterwave.enabled) {
        throw new Error('Flutterwave not configured');
      }

      const transferData = {
        account_bank: request.bank_code,
        account_number: request.account_number,
        amount: request.amount,
        narration: request.narration,
        currency: 'KES',
        reference: request.reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/flutterwave/transfer`,
        debit_currency: 'KES'
      };

      const response = await fetch(`${flutterwave.baseUrl}/transfers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${flutterwave.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transferData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(`Flutterwave transfer failed: ${responseData.message || response.statusText}`);
      }

      if (responseData.status !== 'success') {
        throw new Error(`Flutterwave transfer failed: ${responseData.message || 'Unknown error'}`);
      }

      return {
        success: true,
        transaction_id: responseData.data.id,
        reference: responseData.data.reference,
        status: 'processing',
        message: 'Transfer initiated successfully'
      };

    } catch (error) {
      console.error('Flutterwave transfer error:', error);
      return {
        success: false,
        status: 'failed',
        message: 'Transfer failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send bank transfer using Paystack
   */
  private async sendPaystackTransfer(request: BankTransferRequest): Promise<BankTransferResponse> {
    try {
      const { paystack } = this.PROVIDERS;
      
      if (!paystack.enabled) {
        throw new Error('Paystack not configured');
      }

      // First, create a transfer recipient
      const recipientData = {
        type: 'nuban',
        name: request.account_name,
        account_number: request.account_number,
        bank_code: request.bank_code,
        currency: 'KES'
      };

      const recipientResponse = await fetch(`${paystack.baseUrl}/transferrecipient`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystack.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recipientData)
      });

      const recipientResult = await recipientResponse.json();

      if (!recipientResponse.ok || !recipientResult.status) {
        throw new Error(`Failed to create recipient: ${recipientResult.message || 'Unknown error'}`);
      }

      // Now initiate the transfer
      const transferData = {
        source: 'balance',
        amount: request.amount * 100, // Paystack uses kobo (cents)
        recipient: recipientResult.data.recipient_code,
        reason: request.narration,
        reference: request.reference
      };

      const transferResponse = await fetch(`${paystack.baseUrl}/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystack.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transferData)
      });

      const transferResult = await transferResponse.json();

      if (!transferResponse.ok || !transferResult.status) {
        throw new Error(`Paystack transfer failed: ${transferResult.message || 'Unknown error'}`);
      }

      return {
        success: true,
        transaction_id: transferResult.data.id,
        reference: transferResult.data.reference,
        status: 'processing',
        message: 'Transfer initiated successfully'
      };

    } catch (error) {
      console.error('Paystack transfer error:', error);
      return {
        success: false,
        status: 'failed',
        message: 'Transfer failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Simulate bank transfer for testing/development
   */
  private async simulateBankTransfer(request: BankTransferRequest): Promise<BankTransferResponse> {
    console.log(`SIMULATED BANK TRANSFER: ${request.group_name} - KES ${request.amount} to ${request.account_number}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate 90% success rate
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        transaction_id: `SIM-${Date.now()}`,
        reference: request.reference,
        status: 'completed',
        message: 'Simulated transfer completed successfully'
      };
    } else {
      return {
        success: false,
        status: 'failed',
        message: 'Simulated transfer failed',
        error: 'Simulated failure for testing'
      };
    }
  }

  /**
   * Send a single bank transfer
   */
  async sendBankTransfer(request: BankTransferRequest): Promise<BankTransferResponse> {
    try {
      // Try providers in order of preference
      if (this.PROVIDERS.flutterwave.enabled) {
        return await this.sendFlutterwaveTransfer(request);
      } else if (this.PROVIDERS.paystack.enabled) {
        return await this.sendPaystackTransfer(request);
      } else {
        // Fallback to simulation
        return await this.simulateBankTransfer(request);
      }

    } catch (error) {
      console.error('Bank transfer error:', error);
      return {
        success: false,
        status: 'failed',
        message: 'Transfer failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process bulk bank transfers for group payouts
   */
  async processBulkBankTransfers(payouts: Payout[]): Promise<BulkBankTransferResult> {
    const results: BankTransferResult[] = [];
    const errors: string[] = [];
    let successfulTransfers = 0;
    let totalAmount = 0;

    console.log(`Processing ${payouts.length} bank transfers...`);

    for (const payout of payouts) {
      try {
        // Get bank account for this group
        const bankAccount = await this.getBankAccountForGroup(payout.restaurant_id, payout.group_name!);
        
        if (!bankAccount) {
          throw new Error(`No bank account configured for group: ${payout.group_name}`);
        }

        // Add delay between transfers to avoid rate limiting
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }

        const transferRequest: BankTransferRequest = {
          payout_id: payout.id,
          group_name: payout.group_name!,
          amount: payout.amount,
          account_name: bankAccount.account_name,
          account_number: bankAccount.account_number,
          bank_name: bankAccount.bank_name,
          bank_code: bankAccount.bank_code,
          reference: `PAYOUT-${payout.id.slice(-8)}`,
          narration: `Tip payout for ${payout.group_name} - ${new Date().toLocaleDateString()}`
        };

        const response = await this.sendBankTransfer(transferRequest);

        results.push({
          success: response.success,
          payout_id: payout.id,
          group_name: payout.group_name!,
          amount: payout.amount,
          transaction_id: response.transaction_id,
          reference: response.reference,
          error: response.error
        });

        if (response.success) {
          successfulTransfers++;
          totalAmount += payout.amount;
          console.log(`✓ Bank transfer sent for ${payout.group_name}: KES ${payout.amount}`);
        } else {
          errors.push(`${payout.group_name}: ${response.error || response.message}`);
          console.error(`✗ Failed bank transfer for ${payout.group_name}: ${response.error || response.message}`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.push({
          success: false,
          payout_id: payout.id,
          group_name: payout.group_name!,
          amount: payout.amount,
          error: errorMessage
        });

        errors.push(`${payout.group_name}: ${errorMessage}`);
        console.error(`✗ Failed bank transfer for ${payout.group_name}: ${errorMessage}`);
      }
    }

    const batchResult: BulkBankTransferResult = {
      success: errors.length === 0,
      total_transfers: payouts.length,
      successful_transfers: successfulTransfers,
      failed_transfers: payouts.length - successfulTransfers,
      total_amount: totalAmount,
      results,
      errors
    };

    console.log(`Bank transfer batch completed: ${successfulTransfers}/${payouts.length} successful, KES ${totalAmount} total`);

    return batchResult;
  }

  /**
   * Validate bank account details
   */
  async validateBankAccount(bankCode: string, accountNumber: string): Promise<{
    valid: boolean;
    account_name?: string;
    error?: string;
  }> {
    try {
      // Try Flutterwave account validation
      if (this.PROVIDERS.flutterwave.enabled) {
        const response = await fetch(`${this.PROVIDERS.flutterwave.baseUrl}/accounts/resolve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.PROVIDERS.flutterwave.secretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            account_number: accountNumber,
            account_bank: bankCode
          })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
          return {
            valid: true,
            account_name: data.data.account_name
          };
        }
      }

      // Try Paystack account validation
      if (this.PROVIDERS.paystack.enabled) {
        const response = await fetch(
          `${this.PROVIDERS.paystack.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
          {
            headers: {
              'Authorization': `Bearer ${this.PROVIDERS.paystack.secretKey}`
            }
          }
        );

        const data = await response.json();

        if (response.ok && data.status) {
          return {
            valid: true,
            account_name: data.data.account_name
          };
        }
      }

      // If no provider is available, assume valid for testing
      return {
        valid: true,
        account_name: 'Test Account Name'
      };

    } catch (error) {
      console.error('Bank account validation error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Get list of supported banks
   */
  async getSupportedBanks(): Promise<Array<{
    name: string;
    code: string;
    country: string;
  }>> {
    try {
      // Try to get banks from Flutterwave
      if (this.PROVIDERS.flutterwave.enabled) {
        const response = await fetch(`${this.PROVIDERS.flutterwave.baseUrl}/banks/KE`, {
          headers: {
            'Authorization': `Bearer ${this.PROVIDERS.flutterwave.secretKey}`
          }
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
          return data.data.map((bank: any) => ({
            name: bank.name,
            code: bank.code,
            country: 'KE'
          }));
        }
      }

      // Try to get banks from Paystack
      if (this.PROVIDERS.paystack.enabled) {
        const response = await fetch(`${this.PROVIDERS.paystack.baseUrl}/bank?country=kenya`, {
          headers: {
            'Authorization': `Bearer ${this.PROVIDERS.paystack.secretKey}`
          }
        });

        const data = await response.json();

        if (response.ok && data.status) {
          return data.data.map((bank: any) => ({
            name: bank.name,
            code: bank.code,
            country: 'KE'
          }));
        }
      }

      // Fallback to common Kenyan banks
      return [
        { name: 'Equity Bank', code: '068', country: 'KE' },
        { name: 'KCB Bank', code: '001', country: 'KE' },
        { name: 'Cooperative Bank', code: '011', country: 'KE' },
        { name: 'ABSA Bank Kenya', code: '003', country: 'KE' },
        { name: 'Standard Chartered Bank', code: '002', country: 'KE' },
        { name: 'NCBA Bank', code: '007', country: 'KE' },
        { name: 'Stanbic Bank', code: '031', country: 'KE' },
        { name: 'Diamond Trust Bank', code: '063', country: 'KE' },
        { name: 'I&M Bank', code: '057', country: 'KE' },
        { name: 'Family Bank', code: '070', country: 'KE' }
      ];

    } catch (error) {
      console.error('Error fetching supported banks:', error);
      return [];
    }
  }

  /**
   * Test bank transfer connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; provider?: string }> {
    try {
      if (this.PROVIDERS.flutterwave.enabled) {
        const response = await fetch(`${this.PROVIDERS.flutterwave.baseUrl}/banks/KE`, {
          headers: {
            'Authorization': `Bearer ${this.PROVIDERS.flutterwave.secretKey}`
          }
        });

        if (response.ok) {
          return {
            success: true,
            message: 'Flutterwave bank transfer connection successful',
            provider: 'flutterwave'
          };
        }
      }

      if (this.PROVIDERS.paystack.enabled) {
        const response = await fetch(`${this.PROVIDERS.paystack.baseUrl}/bank`, {
          headers: {
            'Authorization': `Bearer ${this.PROVIDERS.paystack.secretKey}`
          }
        });

        if (response.ok) {
          return {
            success: true,
            message: 'Paystack bank transfer connection successful',
            provider: 'paystack'
          };
        }
      }

      return {
        success: true,
        message: 'Bank transfer service running in simulation mode',
        provider: 'simulation'
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
export const bankTransferService = new BankTransferService();