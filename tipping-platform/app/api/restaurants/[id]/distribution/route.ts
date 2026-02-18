import { NextRequest, NextResponse } from 'next/server';
import { distributionService } from '@/utils/distribution/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    
    const groups = await distributionService.getDistributionGroups(restaurantId);
    
    return NextResponse.json({
      success: true,
      data: groups
    });

  } catch (error) {
    console.error('Error fetching distribution groups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch distribution groups' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const body = await request.json();
    
    const { groups } = body;
    
    if (!Array.isArray(groups)) {
      return NextResponse.json(
        { success: false, error: 'Groups must be an array' },
        { status: 400 }
      );
    }

    console.log('Updating distribution groups for restaurant:', restaurantId);
    console.log('Groups received:', JSON.stringify(groups, null, 2));

    const updatedGroups = await distributionService.updateDistributionGroups(restaurantId, groups);
    
    return NextResponse.json({
      success: true,
      data: updatedGroups,
      message: 'Distribution groups updated successfully'
    });

  } catch (error) {
    console.error('Error updating distribution groups:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update distribution groups';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 400 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    
    const defaultGroups = await distributionService.initializeDefaultDistributionGroups(restaurantId);
    
    return NextResponse.json({
      success: true,
      data: defaultGroups,
      message: 'Default distribution groups initialized'
    });

  } catch (error) {
    console.error('Error initializing distribution groups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize distribution groups' 
      },
      { status: 500 }
    );
  }
}