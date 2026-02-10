import { NextRequest, NextResponse } from 'next/server';
import { payoutProcessor } from '@/utils/payouts/processor';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const processPayoutsSchema = z.object({
  restaurant_id: z.string().optional(),
  payout_ids: z.array(z.string()).optional(),
  dry_run: z.boolean().optional().default(false)
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication - this should be restricted to admin users
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validatedData = processPayoutsSchema.parse(body);

    console.log(`Admin processing payouts (${validatedData.dry_run ? 'DRY RUN' : 'LIVE'}):`, {
      restaurant_id: validatedData.restaurant_id,
      payout_ids: validatedData.payout_ids?.length || 'all pending'
    });

    // Process payouts
    const result = await payoutProcessor.processPayouts({
      restaurantId: validatedData.restaurant_id,
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
      ...result
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