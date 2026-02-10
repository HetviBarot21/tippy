import { NextRequest, NextResponse } from 'next/server';
import { bankTransferService } from '@/utils/payments/bank-transfers';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const updateBankAccountSchema = z.object({
  account_name: z.string().min(1).max(255).optional(),
  account_number: z.string().min(8).max(50).optional(),
  bank_name: z.string().min(1).max(255).optional(),
  bank_code: z.string().min(3).max(20).optional(),
  branch_code: z.string().max(20).optional(),
  swift_code: z.string().max(20).optional(),
  is_active: z.boolean().optional()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; accountId: string } }
) {
  try {
    const supabase = createClient();
    const restaurantId = params.id;
    const accountId = params.accountId;

    // Check authentication and restaurant access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Get existing bank account
    const { data: existingAccount, error: accountError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (accountError || !existingAccount) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateBankAccountSchema.parse(body);

    // If account number or bank code is being updated, validate them
    if (validatedData.account_number || validatedData.bank_code) {
      const accountNumber = validatedData.account_number || existingAccount.account_number;
      const bankCode = validatedData.bank_code || existingAccount.bank_code;

      const validation = await bankTransferService.validateBankAccount(bankCode, accountNumber);

      if (!validation.valid) {
        return NextResponse.json(
          { 
            error: 'Invalid bank account details',
            details: validation.error
          },
          { status: 400 }
        );
      }
    }

    // Update bank account
    const updatedAccount = await bankTransferService.upsertBankAccount({
      ...existingAccount,
      ...validatedData,
      id: accountId
    });

    return NextResponse.json({
      success: true,
      bank_account: updatedAccount
    });

  } catch (error) {
    console.error('Error updating bank account:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update bank account' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; accountId: string } }
) {
  try {
    const supabase = createClient();
    const restaurantId = params.id;
    const accountId = params.accountId;

    // Check authentication and restaurant access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Check if bank account exists and belongs to this restaurant
    const { data: existingAccount, error: accountError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (accountError || !existingAccount) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from('bank_accounts')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (deleteError) {
      throw new Error('Failed to delete bank account');
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json(
      { error: 'Failed to delete bank account' },
      { status: 500 }
    );
  }
}