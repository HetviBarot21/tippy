import { NextRequest, NextResponse } from 'next/server';
import { payoutProcessor } from '@/utils/payouts/processor';
import { mpesaBulkPaymentService } from '@/utils/mpesa/bulk-payments';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received M-Pesa B2C callback:', JSON.stringify(body, null, 2));

    // Validate callback structure
    if (!mpesaBulkPaymentService.validateB2CCallback(body)) {
      console.error('Invalid B2C callback structure:', body);
      return NextResponse.json({ error: 'Invalid callback structure' }, { status: 400 });
    }

    // Process the callback
    await payoutProcessor.handleMPesaB2CCallback(body);

    // Respond with success
    return NextResponse.json({ 
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully'
    });

  } catch (error) {
    console.error('Error processing M-Pesa B2C callback:', error);
    
    // Still return success to M-Pesa to avoid retries
    return NextResponse.json({ 
      ResultCode: 0,
      ResultDesc: 'Callback received'
    });
  }
}