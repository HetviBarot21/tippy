/**
 * API endpoint for querying payment status, especially for M-Pesa payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/utils/payments/service';

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

    // Get basic tip information
    const tip = await paymentService.getTipById(tipId);
    
    if (!tip) {
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      );
    }

    // For M-Pesa payments, query the current status
    if (tip.payment_method === 'mpesa') {
      const statusResult = await paymentService.queryMPesaPaymentStatus(tipId);
      
      return NextResponse.json({
        tipId: tip.id,
        paymentMethod: tip.payment_method,
        amount: tip.amount,
        status: statusResult.status,
        message: statusResult.message,
        createdAt: tip.created_at,
        updatedAt: tip.updated_at
      });
    }

    // For other payment methods, return current status
    return NextResponse.json({
      tipId: tip.id,
      paymentMethod: tip.payment_method,
      amount: tip.amount,
      status: tip.payment_status,
      message: `Payment is ${tip.payment_status}`,
      createdAt: tip.created_at,
      updatedAt: tip.updated_at
    });

  } catch (error) {
    console.error('Payment status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}