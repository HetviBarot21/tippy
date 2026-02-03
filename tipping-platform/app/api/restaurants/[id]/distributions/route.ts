import { NextRequest, NextResponse } from 'next/server';
import { distributionService } from '@/utils/distribution/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const tipId = searchParams.get('tipId');

    // If tipId is provided, get distributions for a specific tip
    if (tipId) {
      const distributions = await distributionService.getTipDistributions(tipId);
      return NextResponse.json({
        success: true,
        data: distributions
      });
    }

    // Otherwise, get aggregated distribution summary for the restaurant
    const summary = await distributionService.getRestaurantDistributionSummary(
      restaurantId,
      startDate || undefined,
      endDate || undefined
    );
    
    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching tip distributions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch tip distributions' 
      },
      { status: 500 }
    );
  }
}