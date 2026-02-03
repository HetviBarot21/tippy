/**
 * M-Pesa STK Push callback webhook handler
 * This endpoint receives payment confirmations from M-Pesa
 */

import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/utils/mpesa/service';
import { mpesaConfirmationService } from '@/utils/mpesa/confirmation';
import { distributionService } from '@/utils/distribution/service';
import { createClient } from '@supabase/supabase-js';

// Use service role client to bypass RLS
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('M-Pesa callback received:', JSON.stringify(body, null, 2));

    // Validate callback structure
    if (!mpesaService.validateCallback(body)) {
      console.error('Invalid M-Pesa callback structure:', body);
      return NextResponse.json({ error: 'Invalid callback structure' }, { status: 400 });
    }

    const callback = body.Body.stkCallback;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = callback;

    // Parse transaction status
    const status = mpesaService.parseTransactionStatus(ResultCode);

    // Find the tip record using CheckoutRequestID with restaurant and waiter details
    const supabase = createServiceClient();
    const { data: tip, error: findError } = await supabase
      .from('tips')
      .select(`
        *,
        restaurants:restaurant_id (
          id,
          name,
          commission_rate
        ),
        waiters:waiter_id (
          id,
          name
        )
      `)
      .eq('transaction_id', CheckoutRequestID)
      .single();

    if (findError || !tip) {
      console.error('Tip not found for CheckoutRequestID:', CheckoutRequestID, findError);
      // Still return success to M-Pesa to avoid retries
      return NextResponse.json({ 
        ResultCode: 0, 
        ResultDesc: 'Callback processed' 
      });
    }

    // Ensure proper tenant isolation - verify the tip belongs to a valid restaurant
    if (!tip.restaurants || !tip.restaurant_id) {
      console.error('Invalid tip record - missing restaurant association:', tip.id);
      return NextResponse.json({ 
        ResultCode: 0, 
        ResultDesc: 'Callback processed' 
      });
    }

    if (status === 'completed') {
      // Extract transaction details for successful payments
      const transactionDetails = mpesaService.extractTransactionDetails(body);
      
      if (transactionDetails) {
        // Verify the payment amount matches the tip amount
        if (Math.abs(transactionDetails.amount - tip.amount) > 0.01) {
          console.error('Payment amount mismatch:', {
            expected: tip.amount,
            received: transactionDetails.amount,
            tipId: tip.id
          });
          
          // Mark as failed due to amount mismatch
          await supabase
            .from('tips')
            .update({
              payment_status: 'failed',
              updated_at: new Date().toISOString(),
              metadata: {
                error: 'Payment amount mismatch',
                expectedAmount: tip.amount,
                receivedAmount: transactionDetails.amount,
                checkoutRequestId: CheckoutRequestID,
                merchantRequestId: MerchantRequestID
              }
            })
            .eq('id', tip.id);

          return NextResponse.json({ 
            ResultCode: 0, 
            ResultDesc: 'Callback processed' 
          });
        }

        // Commission should already be calculated correctly from the original tip creation
        // Verify commission calculation matches current restaurant rate
        const currentCommissionRate = tip.restaurants.commission_rate || 10;
        const expectedCommissionAmount = Math.round((tip.amount * currentCommissionRate) / 100 * 100) / 100;
        const expectedNetAmount = Math.round((tip.amount - expectedCommissionAmount) * 100) / 100;

        // Update tip with successful payment details and verified commission
        const { error: updateError } = await supabase
          .from('tips')
          .update({
            payment_status: 'completed',
            transaction_id: transactionDetails.mpesaReceiptNumber, // Use M-Pesa receipt as final transaction ID
            commission_amount: expectedCommissionAmount, // Ensure commission is current
            net_amount: expectedNetAmount, // Ensure net amount is current
            updated_at: new Date().toISOString(),
            metadata: {
              mpesaReceiptNumber: transactionDetails.mpesaReceiptNumber,
              transactionDate: transactionDetails.transactionDate,
              checkoutRequestId: CheckoutRequestID,
              merchantRequestId: MerchantRequestID,
              confirmedAt: new Date().toISOString(),
              commissionRate: currentCommissionRate
            }
          })
          .eq('id', tip.id);

        if (updateError) {
          console.error('Error updating tip status:', updateError);
        } else {
          console.log(`Tip ${tip.id} completed - Amount: KES ${tip.amount}, Commission: KES ${expectedCommissionAmount}, Net: KES ${expectedNetAmount}`);
          
          // Process tip distribution for restaurant-wide tips
          try {
            const distributionResult = await distributionService.processRestaurantTipDistribution({
              ...tip,
              payment_status: 'completed',
              commission_amount: expectedCommissionAmount,
              net_amount: expectedNetAmount
            });

            if (distributionResult.success && distributionResult.distributions && distributionResult.distributions.length > 0) {
              console.log(`Tip ${tip.id} distributed among ${distributionResult.distributions.length} groups:`,
                distributionResult.distributions.map(d => `${d.group_name}: KES ${d.amount}`).join(', '));
            } else if (!distributionResult.success) {
              console.error('Error processing tip distribution:', distributionResult.error);
            }
          } catch (distributionError) {
            console.error('Error processing tip distribution:', distributionError);
            // Don't fail the webhook for distribution errors
          }
          
          // Send payment confirmation to customer
          try {
            await mpesaConfirmationService.processPaymentConfirmation(
              tip,
              transactionDetails.mpesaReceiptNumber,
              transactionDetails.transactionDate,
              tip.restaurants.name,
              tip.waiters?.name
            );
          } catch (confirmationError) {
            console.error('Error sending payment confirmation:', confirmationError);
            // Don't fail the webhook for confirmation errors
          }
        }
      } else {
        console.error('Could not extract transaction details from successful callback');
        // Still mark as completed but without detailed transaction info
        await supabase
          .from('tips')
          .update({
            payment_status: 'completed',
            updated_at: new Date().toISOString(),
            metadata: {
              checkoutRequestId: CheckoutRequestID,
              merchantRequestId: MerchantRequestID,
              confirmedAt: new Date().toISOString(),
              note: 'Completed without detailed transaction info'
            }
          })
          .eq('id', tip.id);
      }
    } else {
      // Handle failed, cancelled, or timeout payments
      const { error: updateError } = await supabase
        .from('tips')
        .update({
          payment_status: status,
          updated_at: new Date().toISOString(),
          metadata: {
            resultCode: ResultCode,
            resultDesc: ResultDesc,
            checkoutRequestId: CheckoutRequestID,
            merchantRequestId: MerchantRequestID,
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', tip.id);

      if (updateError) {
        console.error('Error updating tip status:', updateError);
      } else {
        console.log(`Tip ${tip.id} marked as ${status}: ${ResultDesc}`);
      }
    }

    // Always return success to M-Pesa to avoid retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully'
    });

  } catch (error) {
    console.error('M-Pesa callback processing error:', error);
    
    // Still return success to avoid M-Pesa retries for processing errors
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback received'
    });
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'M-Pesa callback endpoint is active',
    timestamp: new Date().toISOString()
  });
}