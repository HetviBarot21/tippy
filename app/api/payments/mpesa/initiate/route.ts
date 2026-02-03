/**
 * M-Pesa Payment Initiation API Route
 * 
 * Handles STK Push initiation for tip payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { initiateMpesaPayment } from '@/utils/mpesa/service';
import { mpesaPaymentSchema } from '@/types/tip';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = mpesaPaymentSchema.parse(body);
    
    // Initiate M-Pesa payment
    const result = await initiateMpesaPayment(validatedData);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          checkoutRequestId: result.checkoutRequestId,
          merchantRequestId: result.merchantRequestId,
          customerMessage: result.customerMessage
        },
        message: result.message
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('M-Pesa initiation API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}