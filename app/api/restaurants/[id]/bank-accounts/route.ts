/**
 * Restaurant Bank Accounts API
 * 
 * GET /api/restaurants/[id]/bank-accounts - List bank accounts
 * POST /api/restaurants/[id]/bank-accounts - Add bank account
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { validateBankAccount } from '@/utils/bank-transfers/service';

const bankAccountSchema = z.object({
  account_number: z.string().min(8).max(20),
  account_name: z.string().min(2).max(100),
  bank_code: z.string().min(2).max(10),
  bank_name: z.string().min(2).max(100),
  branch_code: z.string().optional(),
  group_name: z.string().min(1).max(100),
  is_default: z.boolean().optional().default(false)
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const supabase = createClient();

    // Verify restaurant access
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found or access denied' },
        { status: 404 }
      );
    }

    // Get bank accounts
    const { data: bankAccounts, error } = await supabase
      .from('restaurant_bank_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch bank accounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      restaurant: restaurant.name,
      bank_accounts: bankAccounts || []
    });

  } catch (error) {
    console.error('Bank accounts GET API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const body = await request.json();
    const accountData = bankAccountSchema.parse(body);
    
    const supabase = createClient();

    // Verify restaurant access
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found or access denied' },
        { status: 404 }
      );
    }

    // Validate bank account
    const validationResult = await validateBankAccount({
      account_number: accountData.account_number,
      account_name: accountData.account_name,
      bank_code: accountData.bank_code,
      bank_name: accountData.bank_name,
      branch_code: accountData.branch_code
    });

    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          error: 'Bank account validation failed',
          message: validationResult.message
        },
        { status: 400 }
      );
    }

    // Check if group already has a bank account
    const { data: existingAccount, error: existingError } = await supabase
      .from('restaurant_bank_accounts')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('group_name', accountData.group_name)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: `Bank account already exists for group: ${accountData.group_name}` },
        { status: 409 }
      );
    }

    // If this is set as default, unset other defaults for this restaurant
    if (accountData.is_default) {
      const { error: unsetError } = await supabase
        .from('restaurant_bank_accounts')
        .update({ is_default: false })
        .eq('restaurant_id', restaurantId);

      if (unsetError) {
        console.error('Failed to unset default accounts:', unsetError);
      }
    }

    // Create bank account record
    const { data: bankAccount, error } = await supabase
      .from('restaurant_bank_accounts')
      .insert({
        restaurant_id: restaurantId,
        account_number: accountData.account_number,
        account_name: validationResult.account_name || accountData.account_name,
        bank_code: accountData.bank_code,
        bank_name: accountData.bank_name,
        branch_code: accountData.branch_code,
        group_name: accountData.group_name,
        is_default: accountData.is_default,
        is_verified: true // Since we validated it
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create bank account' },
        { status: 500 }
      );
    }

    // Update distribution group with bank account reference
    const { error: updateGroupError } = await supabase
      .from('distribution_groups')
      .update({
        recipient_account: JSON.stringify({
          account_number: accountData.account_number,
          account_name: validationResult.account_name || accountData.account_name,
          bank_code: accountData.bank_code,
          bank_name: accountData.bank_name,
          branch_code: accountData.branch_code
        })
      })
      .eq('restaurant_id', restaurantId)
      .eq('group_name', accountData.group_name);

    if (updateGroupError) {
      console.error('Failed to update distribution group:', updateGroupError);
    }

    return NextResponse.json({ 
      bank_account: bankAccount,
      message: 'Bank account added successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Bank accounts POST API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}