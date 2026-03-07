import 'server-only';
import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;
export const STRIPE_SECRET_KEY_MISSING_ERROR = 'STRIPE_SECRET_KEY missing';
export const STRIPE_NOT_CONFIGURED_RESPONSE = 'Stripe não configurado. Defina STRIPE_SECRET_KEY no .env';

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error(STRIPE_SECRET_KEY_MISSING_ERROR);
  }

  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: '2026-02-25.clover',
    });
  }

  return stripeSingleton;
}
