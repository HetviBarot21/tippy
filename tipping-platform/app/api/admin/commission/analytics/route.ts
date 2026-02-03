/**
 * Commission Analytics API for YourappsLtd Admin
 * Provides comprehensive commission tracking and reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import { commissionAnalyticsService } from '@/utils/commission/analytics';

/**
 * GET /api/admin/commission/analytics
 * Get commission analytics and reports
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate required date parameters
    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start date and end date are required'
      }, { status: 400 });
    }

    switch (action) {
      case 'summary':
        const summary = await commissionAnalyticsService.getCommissionSummary(startDate, endDate);
        return NextResponse.json({
          success: true,
          data: summary
        });

      case 'restaurants':
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
        const restaurantReport = await commissionAnalyticsService.getRestaurantCommissionReport(
          startDate, 
          endDate, 
          limit
        );
        return NextResponse.json({
          success: true,
          data: restaurantReport
        });

      case 'trends':
        const interval = (searchParams.get('interval') as 'day' | 'week' | 'month') || 'day';
        const trends = await commissionAnalyticsService.getCommissionTrends(startDate, endDate, interval);
        return NextResponse.json({
          success: true,
          data: trends
        });

      case 'payment-methods':
        const paymentBreakdown = await commissionAnalyticsService.getPaymentMethodBreakdown(startDate, endDate);
        return NextResponse.json({
          success: true,
          data: paymentBreakdown
        });

      case 'reconciliation':
        const reconciliation = await commissionAnalyticsService.getCommissionReconciliation(startDate, endDate);
        return NextResponse.json({
          success: true,
          data: reconciliation
        });

      default:
        // Default: return summary
        const defaultSummary = await commissionAnalyticsService.getCommissionSummary(startDate, endDate);
        return NextResponse.json({
          success: true,
          data: defaultSummary
        });
    }

  } catch (error) {
    console.error('Commission analytics API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}