import { NextRequest, NextResponse } from 'next/server';
import { bankTransferService } from '@/utils/payments/bank-transfers';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const createBankAccountSchema = z.object({
  group_name: z.string().min(1).max(100),
  account_name: z.string().min(1).max(255),
  account_number: z.string().min(8).max(50),
  bank_name: z.string().min(1).max(255),
  bank_code: z.string().min(3).max(20),
  branch_code: z.string().max(20).optional(),
  swift_code: z.string().max(20).optional(),
  is_active: z.boolean().optional().default(true)
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const restaurantId = params.id;

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

    // Get bank accounts for the restaurant
    const bankAccounts = await bankTransferService.getBankAccounts(restaurantId);

    return NextResponse.json({
      bank_accounts: bankAccounts,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name
      }
    });

  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const restaurantId = params.id;

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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createBankAccountSchema.parse(body);

    // Validate bank account details
    const validation = await bankTransferService.validateBankAccount(
      validatedData.bank_code,
      validatedData.account_number
    );

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid bank account details',
          details: validation.error
        },
        { status: 400 }
      );
    }

    // Create bank account
    const bankAccount = await bankTransferService.upsertBankAccount({
      restaurant_id: restaurantId,
      ...validatedData
    });

    return NextResponse.json({
      success: true,
      bank_account: bankAccount,
      validation: {
        account_name: validation.account_name
      }
    });

  } catch (error) {
    console.error('Error creating bank account:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create bank account' },
      { status: 500 }
    );
  }
}