/**
 * Check Payment Status API
 * 
 * GET /api/payments/status?tipId=xxx
 * Checks the status of a tip payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkTipPaymentStatus } from '@/utils/pesawise/service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipId = searchParams.get('tipId');

    if (!tipId) {
      return NextResponse.json(
        { error: 'Missing tipId parameter' },
        { status: 400 }
      );
    }

    const result = await checkTipPaymentStatus(tipId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        status: result.status,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
