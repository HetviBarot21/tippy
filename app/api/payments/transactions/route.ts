/**
 * Get Wallet Transactions API
 * 
 * GET /api/payments/transactions
 * Fetches transactions from Pesawise wallet for dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletTransactions } from '@/utils/pesawise/service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const result = await getWalletTransactions({
      startDate,
      endDate,
      page,
      limit,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        transactions: result.transactions,
        total: result.total,
        page,
        limit,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
