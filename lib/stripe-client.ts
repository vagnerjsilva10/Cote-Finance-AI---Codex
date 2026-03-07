import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export const STRIPE_PUBLISHABLE_KEY_MISSING_ERROR = 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing';

export function getStripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : null;
}

export function getStripeJs() {
  if (!stripePromise) {
    const key = getStripePublishableKey();
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }

  return stripePromise;
}
