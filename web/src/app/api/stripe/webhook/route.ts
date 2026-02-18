import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getSubscriptionByCustomerId, upsertSubscription } from '@/lib/billing/subscriptions';
import { planFromPriceId, getStripeClient } from '@/lib/stripe/server';
import { logServerError, logServerInfo } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature/secret' }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    logServerError('stripe.webhook.invalid_signature', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.user_id || null;
      const customerId = typeof session.customer === 'string' ? session.customer : null;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
      const planCode = (session.metadata?.plan_code || 'free') as 'free' | 'starter' | 'pro' | 'agency';

      if (userId && customerId) {
        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: null,
          plan_code: planCode,
          status: 'active',
          current_period_end: null,
        });
      }
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : null;
      const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
      if (customerId) {
        const row = await getSubscriptionByCustomerId(customerId);
        if (row) {
          const priceId = sub.items.data[0]?.price?.id ?? null;
          await upsertSubscription({
            user_id: row.user_id,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            stripe_price_id: priceId,
            plan_code: planFromPriceId(priceId),
            status: sub.status,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          });
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : null;
      if (customerId) {
        const row = await getSubscriptionByCustomerId(customerId);
        if (row) {
          await upsertSubscription({
            user_id: row.user_id,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            stripe_price_id: null,
            plan_code: 'free',
            status: 'canceled',
            current_period_end: null,
          });
        }
      }
    }
  } catch (error) {
    logServerError('stripe.webhook.handle_error', error, { eventType: event.type });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  logServerInfo('stripe.webhook.ok', { eventType: event.type });
  return NextResponse.json({ received: true });
}
