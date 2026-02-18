/**
 * Get Wallet Balance API
 * 
 * GET /api/payments/balance
 * Fetches current wallet balance from Pesawise
 */

import { NextResponse } from 'next/server';
import { getWalletBalance } from '@/utils/pesawise/service';

export async function GET() {
  try {
    const result = await getWalletBalance();

    if (result.success) {
      return NextResponse.json({
        success: true,
        balance: result.balance,
        currency: result.currency,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
