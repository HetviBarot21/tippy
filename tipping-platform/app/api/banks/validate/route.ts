import { NextRequest, NextResponse } from 'next/server';
import { bankTransferService } from '@/utils/payments/bank-transfers';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const validateAccountSchema = z.object({
  bank_code: z.string().min(3).max(20),
  account_number: z.string().min(8).max(50)
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateAccountSchema.parse(body);

    // Validate bank account
    const validation = await bankTransferService.validateBankAccount(
      validatedData.bank_code,
      validatedData.account_number
    );

    return NextResponse.json({
      valid: validation.valid,
      account_name: validation.account_name,
      error: validation.error
    });

  } catch (error) {
    console.error('Error validating bank account:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to validate bank account' },
      { status: 500 }
    );
  }
}