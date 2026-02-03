/**
 * API endpoint for retrieving payment confirmation details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client to bypass RLS for payment confirmations
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tipId: string } }
) {
  try {
    const { tipId } = params;

    if (!tipId) {
      return NextResponse.json(
        { error: 'Tip ID is required' },
        { status: 400 }
      );
    }

    // Get tip with restaurant and waiter details
    const supabase = createServiceClient();
    const { data: tip, error } = await supabase
      .from('tips')
      .select(`
        *,
        restaurants:restaurant_id (
          id,
          name,
          commission_rate
        ),
        waiters:waiter_id (
          id,
          name
        ),
        qr_codes:table_id (
          id,
          table_number,
          table_name
        )
      `)
      .eq('id', tipId)
      .single();

    if (error || !tip) {
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      );
    }

    // Format confirmation details
    const confirmation = {
      tipId: tip.id,
      amount: tip.amount,
      commissionAmount: tip.commission_amount,
      netAmount: tip.net_amount,
      tipType: tip.tip_type,
      paymentMethod: tip.payment_method,
      paymentStatus: tip.payment_status,
      transactionId: tip.transaction_id,
      customerPhone: tip.customer_phone,
      restaurant: {
        id: tip.restaurants?.id,
        name: tip.restaurants?.name,
        commissionRate: tip.restaurants?.commission_rate
      },
      waiter: tip.waiters ? {
        id: tip.waiters.id,
        name: tip.waiters.name
      } : null,
      table: tip.qr_codes ? {
        id: tip.qr_codes.id,
        number: tip.qr_codes.table_number,
        name: tip.qr_codes.table_name
      } : null,
      metadata: tip.metadata || {},
      createdAt: tip.created_at,
      updatedAt: tip.updated_at
    };

    // Add M-Pesa specific details if available
    if (tip.payment_method === 'mpesa' && tip.metadata) {
      const metadata = tip.metadata as any;
      confirmation.mpesaDetails = {
        receiptNumber: metadata.mpesaReceiptNumber,
        transactionDate: metadata.transactionDate,
        checkoutRequestId: metadata.checkoutRequestId,
        merchantRequestId: metadata.merchantRequestId
      };
    }

    return NextResponse.json(confirmation);

  } catch (error) {
    console.error('Payment confirmation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}