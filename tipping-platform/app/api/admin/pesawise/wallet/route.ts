import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/tenant-client';
import { pesaWiseService } from '@/utils/pesawise/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super admin
    const isSuperAdmin = user.email && (
      user.email.endsWith('@yourapps.co.ke') || 
      user.email.endsWith('@yourappsltd.com') ||
      ['admin@tippy.co.ke', 'support@tippy.co.ke'].includes(user.email)
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');

    // Get wallet balance
    const balanceResponse = await pesaWiseService.getAccountBalance();

    // Get wallet transactions
    const transactionsResponse = await pesaWiseService.getWalletTransactions(
      undefined,
      page,
      perPage
    );

    return NextResponse.json({
      balance: balanceResponse,
      transactions: transactionsResponse
    });

  } catch (error) {
    console.error('PesaWise wallet API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
