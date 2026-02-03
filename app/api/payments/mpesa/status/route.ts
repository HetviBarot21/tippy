/**
 * M-Pesa Payment Status Query API Route
 * 
 * Handles STK Push status queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryMpesaPaymentStatus } from '@/utils/mpesa/service';
import { z } from 'zod';

const statusQuerySchema = z.object({
  checkoutRequestId: z.string().min(1, 'Checkout request ID is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const { checkoutRequestId } = statusQuerySchema.parse(body);
    
    // Query M-Pesa payment status
    const result = await queryMpesaPaymentStatus(checkoutRequestId);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('M-Pesa status query API error:', error);
    
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