/**
 * Bank Transfer Service
 * 
 * Handles bank transfers for restaurant group payouts
 * Supports multiple bank transfer providers
 */

'use server';

import { createClient as createAdminClient } from '@/utils/supabase/admin';

export interface BankAccount {
  account_number: string;
  account_name: string;
  bank_code: string;
  bank_name: string;
  branch_code?: string;
}

export interface BankTransferRequest {
  recipient_account: BankAccount;
  amount: number;
  reference: string;
  narration: string;
  currency?: string;
}

export interface BankTransferResponse {
  success: boolean;
  transaction_id?: string;
  reference?: string;
  message: string;
  provider_response?: any;
}

export interface BankTransferProvider {
  name: string;
  initiate(request: BankTransferRequest): Promise<BankTransferResponse>;
  queryStatus(transactionId: string): Promise<BankTransferResponse>;
  validateAccount(account: BankAccount): Promise<{ valid: boolean; account_name?: string; message: string }>;
}

/**
 * Mock Bank Transfer Provider for testing
 */
class MockBankTransferProvider implements BankTransferProvider {
  name = 'Mock Provider';

  async initiate(request: BankTransferRequest): Promise<BankTransferResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      return {
        success: true,
        transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reference: request.reference,
        message: 'Transfer initiated successfully',
        provider_response: {
          status: 'SUCCESS',
          amount: request.amount,
          recipient: request.recipient_account.account_name
        }
      };
    } else {
      return {
        success: false,
        message: 'Transfer failed - insufficient funds or invalid account',
        provider_response: {
          status: 'FAILED',
          error_code: 'INSUFFICIENT_FUNDS'
        }
      };
    }
  }

  async queryStatus(transactionId: string): Promise<BankTransferResponse> {
    // Simulate status check
    return {
      success: true,
      transaction_id: transactionId,
      message: 'Transfer completed successfully',
      provider_response: {
        status: 'COMPLETED',
        transaction_id: transactionId
      }
    };
  }

  async validateAccount(account: BankAccount): Promise<{ valid: boolean; account_name?: string; message: string }> {
    // Simulate account validation
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate 90% valid accounts
    const valid = Math.random() > 0.1;

    if (valid) {
      return {
        valid: true,
        account_name: account.account_name || 'VERIFIED ACCOUNT HOLDER',
        message: 'Account validated successfully'
      };
    } else {
      return {
        valid: false,
        message: 'Invalid account number or bank details'
      };
    }
  }
}

/**
 * Flutterwave Bank Transfer Provider
 * (Placeholder implementation - would need actual Flutterwave integration)
 */
class FlutterwaveBankTransferProvider implements BankTransferProvider {
  name = 'Flutterwave';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
    this.baseUrl = process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3';
  }

  async initiate(request: BankTransferRequest): Promise<BankTransferResponse> {
    try {
      // This would be the actual Flutterwave API call
      const response = await fetch(`${this.baseUrl}/transfers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_bank: request.recipient_account.bank_code,
          account_number: request.recipient_account.account_number,
          amount: request.amount,
          narration: request.narration,
          currency: request.currency || 'KES',
          reference: request.reference,
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/bank-transfer`,
          debit_currency: 'KES'
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        return {
          success: true,
          transaction_id: data.data.id.toString(),
          reference: data.data.reference,
          message: 'Transfer initiated successfully',
          provider_response: data
        };
      } else {
        return {
          success: false,
          message: data.message || 'Transfer initiation failed',
          provider_response: data
        };
      }
    } catch (error) {
      console.error('Flutterwave transfer error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Transfer failed'
      };
    }
  }

  async queryStatus(transactionId: string): Promise<BankTransferResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transfers/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      return {
        success: response.ok,
        transaction_id: transactionId,
        message: data.message || 'Status retrieved',
        provider_response: data
      };
    } catch (error) {
      console.error('Flutterwave status query error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Status query failed'
      };
    }
  }

  async validateAccount(account: BankAccount): Promise<{ valid: boolean; account_name?: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_number: account.account_number,
          account_bank: account.bank_code
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        return {
          valid: true,
          account_name: data.data.account_name,
          message: 'Account validated successfully'
        };
      } else {
        return {
          valid: false,
          message: data.message || 'Account validation failed'
        };
      }
    } catch (error) {
      console.error('Flutterwave account validation error:', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }
}

// Provider factory
function getBankTransferProvider(): BankTransferProvider {
  const provider = process.env.BANK_TRANSFER_PROVIDER || 'mock';
  
  switch (provider.toLowerCase()) {
    case 'flutterwave':
      return new FlutterwaveBankTransferProvider();
    case 'mock':
    default:
      return new MockBankTransferProvider();
  }
}

/**
 * Process bank transfers for group payouts
 */
export async function processBankTransfers(
  payoutIds: string[]
): Promise<{
  success: boolean;
  processed_count: number;
  failed_count: number;
  results: Array<{
    payout_id: string;
    success: boolean;
    transaction_id?: string;
    error?: string;
  }>;
  message: string;
}> {
  try {
    const adminSupabase = createAdminClient();
    const provider = getBankTransferProvider();
    
    // Get group payout records
    const { data: payouts, error: fetchError } = await adminSupabase
      .from('payouts')
      .select(`
        *,
        restaurant:restaurants(name)
      `)
      .in('id', payoutIds)
      .eq('payout_type', 'group')
      .eq('status', 'pending');

    if (fetchError) {
      throw new Error(`Failed to fetch payouts: ${fetchError.message}`);
    }

    if (!payouts || payouts.length === 0) {
      return {
        success: true,
        processed_count: 0,
        failed_count: 0,
        results: [],
        message: 'No pending group payouts found'
      };
    }

    // Update payouts to processing status
    const { error: updateError } = await adminSupabase
      .from('payouts')
      .update({ status: 'processing' })
      .in('id', payoutIds);

    if (updateError) {
      console.error('Failed to update payout status to processing:', updateError);
    }

    const results = [];
    let processedCount = 0;
    let failedCount = 0;

    // Process each payout
    for (const payout of payouts) {
      try {
        // Parse recipient account details
        let recipientAccount: BankAccount;
        try {
          recipientAccount = JSON.parse(payout.recipient_account || '{}');
        } catch (parseError) {
          throw new Error('Invalid recipient account format');
        }

        if (!recipientAccount.account_number || !recipientAccount.bank_code) {
          throw new Error('Missing required account details');
        }

        // Initiate bank transfer
        const transferResult = await provider.initiate({
          recipient_account: recipientAccount,
          amount: Math.round(payout.amount), // Ensure integer amount
          reference: `PAYOUT-${payout.id}`,
          narration: `${payout.group_name} payout - ${payout.restaurant.name}`,
          currency: 'KES'
        });

        if (transferResult.success) {
          // Update payout as completed
          const { error } = await adminSupabase
            .from('payouts')
            .update({
              status: 'completed',
              transaction_reference: transferResult.transaction_id,
              processed_at: new Date().toISOString()
            })
            .eq('id', payout.id);

          if (error) {
            console.error(`Failed to update payout ${payout.id}:`, error);
            results.push({
              payout_id: payout.id,
              success: false,
              error: 'Database update failed'
            });
            failedCount++;
          } else {
            results.push({
              payout_id: payout.id,
              success: true,
              transaction_id: transferResult.transaction_id
            });
            processedCount++;
          }
        } else {
          throw new Error(transferResult.message);
        }

      } catch (error) {
        console.error(`Bank transfer failed for payout ${payout.id}:`, error);
        
        // Update payout as failed
        const { error: updateError } = await adminSupabase
          .from('payouts')
          .update({
            status: 'failed',
            transaction_reference: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
          .eq('id', payout.id);

        if (updateError) {
          console.error(`Failed to update failed payout ${payout.id}:`, updateError);
        }

        results.push({
          payout_id: payout.id,
          success: false,
          error: error instanceof Error ? error.message : 'Transfer failed'
        });
        failedCount++;
      }

      // Add delay between transfers to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return {
      success: true,
      processed_count: processedCount,
      failed_count: failedCount,
      results,
      message: `Processed ${processedCount} transfers, ${failedCount} failed`
    };

  } catch (error) {
    console.error('Bank transfer processing error:', error);
    
    // Revert payouts back to pending status on error
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase
        .from('payouts')
        .update({ status: 'pending' })
        .in('id', payoutIds)
        .eq('status', 'processing');
    } catch (revertError) {
      console.error('Failed to revert payout status:', revertError);
    }

    return {
      success: false,
      processed_count: 0,
      failed_count: payoutIds.length,
      results: payoutIds.map(id => ({
        payout_id: id,
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      })),
      message: error instanceof Error ? error.message : 'Bank transfer processing failed'
    };
  }
}

/**
 * Validate bank account details
 */
export async function validateBankAccount(
  account: BankAccount
): Promise<{ valid: boolean; account_name?: string; message: string }> {
  try {
    const provider = getBankTransferProvider();
    return await provider.validateAccount(account);
  } catch (error) {
    console.error('Bank account validation error:', error);
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}

/**
 * Get supported banks list
 */
export async function getSupportedBanks(): Promise<{
  success: boolean;
  banks?: Array<{ code: string; name: string }>;
  message: string;
}> {
  try {
    // This would typically fetch from the bank transfer provider's API
    // For now, return common Kenyan banks
    const banks = [
      { code: '01', name: 'Kenya Commercial Bank (KCB)' },
      { code: '02', name: 'Standard Chartered Bank' },
      { code: '03', name: 'Barclays Bank of Kenya' },
      { code: '04', name: 'The Co-operative Bank of Kenya' },
      { code: '05', name: 'Equity Bank Kenya' },
      { code: '06', name: 'Family Bank' },
      { code: '07', name: 'Diamond Trust Bank Kenya' },
      { code: '08', name: 'Housing Finance Company of Kenya' },
      { code: '09', name: 'NIC Bank' },
      { code: '10', name: 'Prime Bank' },
      { code: '11', name: 'African Banking Corporation' },
      { code: '12', name: 'Chase Bank Kenya' },
      { code: '13', name: 'Citibank' },
      { code: '14', name: 'Credit Bank' },
      { code: '15', name: 'Development Bank of Kenya' },
      { code: '16', name: 'Ecobank Kenya' },
      { code: '17', name: 'Guaranty Trust Bank Kenya' },
      { code: '18', name: 'I&M Bank' },
      { code: '19', name: 'Jamii Bora Bank' },
      { code: '20', name: 'National Bank of Kenya' }
    ];

    return {
      success: true,
      banks,
      message: 'Banks retrieved successfully'
    };
  } catch (error) {
    console.error('Get supported banks error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get banks'
    };
  }
}