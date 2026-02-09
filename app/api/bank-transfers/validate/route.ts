/**
 * Bank Account Validation API
 * 
 * POST /api/bank-transfers/validate
 * Validate bank account details
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBankAccount, getSupportedBanks } from '@/utils/bank-transfers/service';

const validateAccountSchema = z.object({
  account_number: z.string().min(8).max(20),
  account_name: z.string().min(2).max(100),
  bank_code: z.string().min(2).max(10),
  bank_name: z.string().min(2).max(100),
  branch_code: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accountData = validateAccountSchema.parse(body);

    const result = await validateBankAccount(accountData);

    if (!result.valid) {
      return NextResponse.json(
        { 
          valid: false,
          message: result.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      account_name: result.account_name,
      message: result.message
    });

  } catch (error) {
    console.error('Bank account validation API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid account data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await getSupportedBanks();

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      banks: result.banks
    });

  } catch (error) {
    console.error('Get supported banks API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}