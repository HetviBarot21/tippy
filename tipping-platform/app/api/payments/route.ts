import { NextRequest, NextResponse } from 'next/server';
import { paymentService, CreateTipRequest } from '@/utils/payments/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const tipRequest: CreateTipRequest = {
      amount: body.amount,
      tipType: body.tipType,
      restaurantId: body.restaurantId,
      waiterId: body.waiterId,
      tableId: body.tableId,
      paymentMethod: body.paymentMethod,
      customerPhone: body.customerPhone
    };

    const result = await paymentService.createTipAndInitiatePayment(tipRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}