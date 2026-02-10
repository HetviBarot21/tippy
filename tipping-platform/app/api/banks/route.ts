import { NextRequest, NextResponse } from 'next/server';
import { bankTransferService } from '@/utils/payments/bank-transfers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supported banks
    const banks = await bankTransferService.getSupportedBanks();

    return NextResponse.json({
      banks,
      total: banks.length
    });

  } catch (error) {
    console.error('Error fetching supported banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supported banks' },
      { status: 500 }
    );
  }
}