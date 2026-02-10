/**
 * PesaWise API Test Endpoint
 * Test PesaWise integration and connectivity
 */

import { NextRequest, NextResponse } from 'next/server';
import { pesaWiseService } from '@/utils/pesawise/service';

export async function GET() {
  try {
    // Test API connectivity
    const connectionTest = await pesaWiseService.testConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        message: 'PesaWise API connection failed',
        error: connectionTest.message
      }, { status: 500 });
    }

    // Get account balance
    const balanceResponse = await pesaWiseService.getAccountBalance();
    
    return NextResponse.json({
      success: true,
      message: 'PesaWise API is working correctly',
      data: {
        connection: connectionTest,
        balance: balanceResponse.success ? balanceResponse.data : null
      }
    });

  } catch (error) {
    console.error('PesaWise test error:', error);
    return NextResponse.json({
      success: false,
      message: 'PesaWise test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phone, amount } = body;

    if (action === 'stk-push') {
      if (!phone || !amount) {
        return NextResponse.json({
          success: false,
          error: 'Phone number and amount are required'
        }, { status: 400 });
      }

      // Test STK Push
      const stkResponse = await pesaWiseService.initiateSTKPush({
        phoneNumber: phone,
        amount: parseFloat(amount),
        accountReference: `TEST-${Date.now()}`,
        transactionDesc: 'PesaWise API Test Payment'
      });

      return NextResponse.json(stkResponse);
    }

    if (action === 'status-query') {
      const { checkoutRequestId } = body;
      
      if (!checkoutRequestId) {
        return NextResponse.json({
          success: false,
          error: 'Checkout request ID is required'
        }, { status: 400 });
      }

      // Test status query
      const statusResponse = await pesaWiseService.querySTKPushStatus(checkoutRequestId);
      
      return NextResponse.json(statusResponse);
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "stk-push" or "status-query"'
    }, { status: 400 });

  } catch (error) {
    console.error('PesaWise test POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}