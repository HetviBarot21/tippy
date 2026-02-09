/**
 * M-Pesa B2C Webhook Handler
 * 
 * POST /api/webhooks/mpesa/b2c
 * Handle M-Pesa B2C payment result callbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';

interface MpesaB2CCallback {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID?: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string;
        Value: string | number;
      }>;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MpesaB2CCallback = await request.json();
    const result = body.Result;

    console.log('M-Pesa B2C callback received:', JSON.stringify(body, null, 2));

    // Find the payout record by conversation ID
    const adminSupabase = createAdminClient();
    const { data: payout, error: fetchError } = await adminSupabase
      .from('payouts')
      .select('*')
      .eq('transaction_reference', result.ConversationID)
      .single();

    if (fetchError || !payout) {
      console.error('Payout not found for conversation ID:', result.ConversationID);
      return NextResponse.json({ 
        ResultCode: 0,
        ResultDesc: 'Accepted'
      });
    }

    // Process the callback based on result code
    if (result.ResultCode === 0) {
      // Success - extract transaction details
      let transactionId = result.TransactionID;
      let recipientInfo = '';

      if (result.ResultParameters?.ResultParameter) {
        for (const param of result.ResultParameters.ResultParameter) {
          if (param.Key === 'TransactionReceipt') {
            transactionId = param.Value.toString();
          } else if (param.Key === 'ReceiverPartyPublicName') {
            recipientInfo = param.Value.toString();
          }
        }
      }

      // Update payout as completed
      const { error: updateError } = await adminSupabase
        .from('payouts')
        .update({
          status: 'completed',
          transaction_reference: transactionId || result.ConversationID,
          processed_at: new Date().toISOString()
        })
        .eq('id', payout.id);

      if (updateError) {
        console.error('Failed to update payout status:', updateError);
      } else {
        console.log(`Payout ${payout.id} completed successfully. Transaction ID: ${transactionId}`);
      }

    } else {
      // Failed - update payout as failed
      const { error: updateError } = await adminSupabase
        .from('payouts')
        .update({
          status: 'failed',
          transaction_reference: `FAILED: ${result.ResultDesc} (Code: ${result.ResultCode})`
        })
        .eq('id', payout.id);

      if (updateError) {
        console.error('Failed to update payout status:', updateError);
      } else {
        console.log(`Payout ${payout.id} failed: ${result.ResultDesc}`);
      }
    }

    // Store the callback for audit purposes
    const { error: auditError } = await adminSupabase
      .from('mpesa_callbacks')
      .insert({
        payout_id: payout.id,
        callback_type: 'b2c_result',
        conversation_id: result.ConversationID,
        result_code: result.ResultCode,
        result_desc: result.ResultDesc,
        transaction_id: result.TransactionID,
        callback_data: body,
        created_at: new Date().toISOString()
      });

    if (auditError) {
      console.error('Failed to store callback audit:', auditError);
    }

    // Always respond with success to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });

  } catch (error) {
    console.error('M-Pesa B2C callback error:', error);
    
    // Still respond with success to avoid M-Pesa retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  }
}