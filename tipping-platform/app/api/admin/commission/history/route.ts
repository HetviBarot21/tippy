/**
 * Commission Rate History API
 * Provides audit trail for commission rate changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { commissionService } from '@/utils/commission/service';

/**
 * GET /api/admin/commission/history
 * Get commission rate change history for a restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant ID is required'
      }, { status: 400 });
    }

    const history = await commissionService.getCommissionRateHistory(restaurantId);

    return NextResponse.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Commission history API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}