import "server-only";
import Stripe from "stripe";

let cached: Stripe | null | undefined;

/** Stripe client when STRIPE_SECRET_KEY is configured, otherwise null (checkout falls back to test-payment mode). */
export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
