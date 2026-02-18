/**
 * Initiate Tip Payment API
 * 
 * POST /api/payments/initiate
 * Initiates M-Pesa STK Push or Card payment for tips via Pesawise
 */

import { NextRequest, NextResponse } from 'next/server';
import { initiateTipPayment } from '@/utils/pesawise/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { restaurantId, waiterId, amount, phoneNumber, tipType, tableId, paymentMethod } = body;

    // Validation
    if (!restaurantId || !amount || !tipType || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, amount, tipType, paymentMethod' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!['waiter', 'restaurant'].includes(tipType)) {
      return NextResponse.json(
        { error: 'Invalid tipType. Must be "waiter" or "restaurant"' },
        { status: 400 }
      );
    }

    if (!['mpesa', 'card'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid paymentMethod. Must be "mpesa" or "card"' },
        { status: 400 }
      );
    }

    // M-Pesa requires phone number
    if (paymentMethod === 'mpesa' && !phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number required for M-Pesa payment' },
        { status: 400 }
      );
    }

    // Initiate payment
    const result = await initiateTipPayment({
      restaurantId,
      waiterId,
      amount: parseFloat(amount),
      phoneNumber,
      tipType,
      tableId,
      paymentMethod,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        tipId: result.tipId,
        checkoutRequestId: result.checkoutRequestId,
        paymentLink: result.paymentLink,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
