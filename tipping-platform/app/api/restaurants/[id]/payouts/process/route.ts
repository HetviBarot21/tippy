import { NextRequest, NextResponse } from 'next/server';
import { payoutProcessor } from '@/utils/payouts/processor';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const processPayoutsSchema = z.object({
  payout_ids: z.array(z.string()).optional(),
  dry_run: z.boolean().optional().default(false)
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const restaurantId = params.id;

    // Check authentication and restaurant access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validatedData = processPayoutsSchema.parse(body);

    console.log(`Processing payouts for restaurant ${restaurant.name} (${validatedData.dry_run ? 'DRY RUN' : 'LIVE'})`);

    // Process payouts
    const result = await payoutProcessor.processPayouts({
      restaurantId,
      payoutIds: validatedData.payout_ids,
      dryRun: validatedData.dry_run
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Some payouts failed to process',
          ...result
        },
        { status: 207 } // Multi-status for partial success
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.processed_payouts} payouts`,
      ...result,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name
      }
    });

  } catch (error) {
    console.error('Error processing payouts:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process payouts' },
      { status: 500 }
    );
  }
}