import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  stripeClient = new Stripe(key);
  return stripeClient;
}

export function getStripePriceId(plan: 'starter' | 'pro' | 'agency') {
  const map = {
    starter: process.env.STRIPE_PRICE_STARTER || '',
    pro: process.env.STRIPE_PRICE_PRO || '',
    agency: process.env.STRIPE_PRICE_AGENCY || '',
  } as const;
  const value = map[plan];
  if (!value) throw new Error(`Missing Stripe price id for plan: ${plan}`);
  return value;
}

export function planFromPriceId(priceId: string | null | undefined): 'free' | 'starter' | 'pro' | 'agency' {
  if (!priceId) return 'free';
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return 'agency';
  return 'free';
}
