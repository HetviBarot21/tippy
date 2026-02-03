/**
 * Commission Management API for YourappsLtd Admin
 * Handles commission rate configuration and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { commissionService } from '@/utils/commission/service';
import { createClient } from '@supabase/supabase-js';

// Create service client for admin operations
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

/**
 * GET /api/admin/commission
 * Get all restaurant commission rates and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'rates') {
      // Get all restaurant commission rates
      const rates = await commissionService.getAllRestaurantCommissionRates();
      
      return NextResponse.json({
        success: true,
        data: rates
      });
    }

    if (action === 'analytics') {
      const restaurantId = searchParams.get('restaurantId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!restaurantId || !startDate || !endDate) {
        return NextResponse.json({
          success: false,
          error: 'Restaurant ID, start date, and end date are required for analytics'
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

    // Default: return all commission rates
    const rates = await commissionService.getAllRestaurantCommissionRates();
    
    return NextResponse.json({
      success: true,
      data: rates
    });

  } catch (error) {
    console.error('Commission API GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/commission
 * Update commission rate for a restaurant
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, commissionRate, reason, changedBy } = body;

    // Validate required fields
    if (!restaurantId || typeof commissionRate !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Restaurant ID and commission rate are required'
      }, { status: 400 });
    }

    // Validate commission rate
    const validation = commissionService.validateCommissionRate(commissionRate);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: validation.error
      }, { status: 400 });
    }

    // Update commission rate
    await commissionService.updateCommissionRate(
      restaurantId,
      commissionRate,
      changedBy,
      reason
    );

    return NextResponse.json({
      success: true,
      message: 'Commission rate updated successfully'
    });

  } catch (error) {
    console.error('Commission API PUT error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/commission/bulk
 * Bulk update commission rates for multiple restaurants
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates, reason, changedBy } = body;

    // Validate request
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Updates array is required and must not be empty'
      }, { status: 400 });
    }

    // Validate each update
    for (const update of updates) {
      if (!update.restaurantId || typeof update.newRate !== 'number') {
        return NextResponse.json({
          success: false,
          error: 'Each update must have restaurantId and newRate'
        }, { status: 400 });
      }

      const validation = commissionService.validateCommissionRate(update.newRate);
      if (!validation.isValid) {
        return NextResponse.json({
          success: false,
          error: `Invalid rate for restaurant ${update.restaurantId}: ${validation.error}`
        }, { status: 400 });
      }
    }

    // Perform bulk update
    await commissionService.bulkUpdateCommissionRates(updates, changedBy, reason);

    return NextResponse.json({
      success: true,
      message: `Successfully updated commission rates for ${updates.length} restaurants`
    });

  } catch (error) {
    console.error('Commission API POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}