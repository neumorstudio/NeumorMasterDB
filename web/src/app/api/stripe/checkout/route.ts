import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getSubscriptionByUserId, upsertSubscription } from '@/lib/billing/subscriptions';
import { getStripeClient, getStripePriceId } from '@/lib/stripe/server';

export const runtime = 'nodejs';

type CheckoutPayload = {
  plan?: 'starter' | 'pro' | 'agency';
};

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as CheckoutPayload;
  const plan = payload.plan;
  if (!plan || !['starter', 'pro', 'agency'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const stripe = getStripeClient();
  const existing = await getSubscriptionByUserId(user.id);
  let customerId = existing?.stripe_customer_id || null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: getStripePriceId(plan), quantity: 1 }],
    success_url: `${baseUrl}/billing?success=1`,
    cancel_url: `${baseUrl}/billing?canceled=1`,
    client_reference_id: user.id,
    metadata: { plan_code: plan, user_id: user.id },
    subscription_data: { metadata: { plan_code: plan, user_id: user.id } },
  });

  await upsertSubscription({
    user_id: user.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: existing?.stripe_subscription_id || null,
    stripe_price_id: existing?.stripe_price_id || null,
    plan_code: existing?.plan_code || 'free',
    status: existing?.status || 'inactive',
    current_period_end: existing?.current_period_end || null,
  });

  return NextResponse.json({ url: session.url });
}
