/**
 * Restaurant-specific Commission API
 * Handles commission rate retrieval and analytics for individual restaurants
 */

import { NextRequest, NextResponse } from 'next/server';
import { commissionService } from '@/utils/commission/service';

/**
 * GET /api/restaurants/[id]/commission
 * Get commission rate and analytics for a specific restaurant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'rate') {
      // Get current commission rate
      const rate = await commissionService.getCommissionRate(restaurantId);
      
      return NextResponse.json({
        success: true,
        data: {
          restaurantId,
          commissionRate: rate
        }
      });
    }

    if (action === 'analytics') {
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!startDate || !endDate) {
        return NextResponse.json({
          success: false,
          error: 'Start date and end date are required for analytics'
        }, { status: 400 });
      }

      const analytics = await commissionService.getCommissionAnalytics(
        restaurantId,
        startDate,
        endDate
      );

      return NextResponse.json({
        success: true,
        data: analytics
      });
    }

    if (action === 'history') {
      // Get commission rate change history
      const history = await commissionService.getCommissionRateHistory(restaurantId);
      
      return NextResponse.json({
        success: true,
        data: history
      });
    }

    // Default: return current rate
    const rate = await commissionService.getCommissionRate(restaurantId);
    
    return NextResponse.json({
      success: true,
      data: {
        restaurantId,
        commissionRate: rate
      }
    });

  } catch (error) {
    console.error('Restaurant commission API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}