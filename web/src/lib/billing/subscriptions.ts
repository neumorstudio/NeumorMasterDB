import { getServerEnv } from '@/lib/env';

type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_code: string;
  status: string;
  current_period_end: string | null;
};

export async function getSubscriptionByUserId(userId: string): Promise<SubscriptionRow | null> {
  const { supabaseKey, supabaseUrl } = getServerEnv();
  const url = new URL(`${supabaseUrl}/rest/v1/billing_subscriptions`);
  url.searchParams.set(
    'select',
    'user_id,stripe_customer_id,stripe_subscription_id,stripe_price_id,plan_code,status,current_period_end',
  );
  url.searchParams.set('user_id', `eq.${userId}`);
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as SubscriptionRow[];
  return rows[0] ?? null;
}

export async function getSubscriptionByCustomerId(customerId: string): Promise<SubscriptionRow | null> {
  const { supabaseKey, supabaseUrl } = getServerEnv();
  const url = new URL(`${supabaseUrl}/rest/v1/billing_subscriptions`);
  url.searchParams.set(
    'select',
    'user_id,stripe_customer_id,stripe_subscription_id,stripe_price_id,plan_code,status,current_period_end',
  );
  url.searchParams.set('stripe_customer_id', `eq.${customerId}`);
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as SubscriptionRow[];
  return rows[0] ?? null;
}

export async function upsertSubscription(row: SubscriptionRow) {
  const { supabaseKey, supabaseUrl } = getServerEnv();
  const response = await fetch(`${supabaseUrl}/rest/v1/billing_subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      ...row,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`upsertSubscription failed: ${body}`);
  }
}
