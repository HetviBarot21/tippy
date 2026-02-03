import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/utils/stripe/config';
import { paymentService } from '@/utils/payments/service';

const relevantEvents = new Set([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled'
]);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error('Missing Stripe signature or webhook secret');
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`🔔 Stripe webhook received: ${event.type}`);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  if (!relevantEvents.has(event.type)) {
    console.log(`Ignoring event type: ${event.type}`);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const tipId = paymentIntent.metadata.tipId;

        if (!tipId) {
          console.error('No tipId found in payment intent metadata');
          return NextResponse.json(
            { error: 'Missing tip ID in metadata' },
            { status: 400 }
          );
        }

        await paymentService.updateTipStatus(tipId, 'completed', paymentIntent.id);
        console.log(`✅ Tip ${tipId} payment completed successfully`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const tipId = paymentIntent.metadata.tipId;

        if (!tipId) {
          console.error('No tipId found in payment intent metadata');
          return NextResponse.json(
            { error: 'Missing tip ID in metadata' },
            { status: 400 }
          );
        }

        await paymentService.updateTipStatus(tipId, 'failed', paymentIntent.id);
        console.log(`❌ Tip ${tipId} payment failed`);
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const tipId = paymentIntent.metadata.tipId;

        if (!tipId) {
          console.error('No tipId found in payment intent metadata');
          return NextResponse.json(
            { error: 'Missing tip ID in metadata' },
            { status: 400 }
          );
        }

        await paymentService.updateTipStatus(tipId, 'cancelled', paymentIntent.id);
        console.log(`🚫 Tip ${tipId} payment cancelled`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}