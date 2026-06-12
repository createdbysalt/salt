import "server-only";

import type { BillingInterval, SaasTier } from "@/app/actions/billing/schemas";

/** Server-side Stripe Price IDs — never accept raw price IDs from the client. */
export const SAAS_PRICE_IDS: Record<string, string> = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "price_starter_month",
  starter_annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || "price_starter_year",
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_month",
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "price_pro_year",
  max_monthly: process.env.STRIPE_PRICE_MAX_MONTHLY || "price_max_month",
  max_annual: process.env.STRIPE_PRICE_MAX_ANNUAL || "price_max_year",
};

export function resolveSaasPriceId(tier: SaasTier, interval: BillingInterval): string | null {
  const key = `${tier}_${interval === "year" ? "annual" : "monthly"}`;
  const priceId = SAAS_PRICE_IDS[key];
  return priceId && priceId.length > 0 ? priceId : null;
}
