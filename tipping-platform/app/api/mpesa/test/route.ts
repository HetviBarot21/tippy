/**
 * Test endpoint for M-Pesa connection and configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/utils/mpesa/service';

export async function GET() {
  try {
    // Test M-Pesa connection
    const connectionTest = await mpesaService.testConnection();
    
    return NextResponse.json({
      success: connectionTest.success,
      message: connectionTest.message,
      timestamp: new Date().toISOString(),
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
    });

  } catch (error) {
    console.error('M-Pesa test error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, amount } = body;

    if (!phoneNumber || !amount) {
      return NextResponse.json({
        error: 'Phone number and amount are required'
      }, { status: 400 });
    }

    // Test STK Push (be careful with this in production)
    const result = await mpesaService.initiateSTKPush({
      phoneNumber,
      amount: Number(amount),
      accountReference: 'TEST-TIP',
      transactionDesc: 'Test M-Pesa payment'
    });

    return NextResponse.json({
      success: true,
      message: 'STK Push initiated successfully',
      data: result
    });

  } catch (error) {
    console.error('M-Pesa STK Push test error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'STK Push test failed'
    }, { status: 500 });
  }
}