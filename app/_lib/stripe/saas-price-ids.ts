import "server-only";

import type { BillingInterval, SaasTier } from "@/app/actions/billing/schemas";

/** Server-side Stripe Price IDs — never accept raw price IDs from the client. */
export const SAAS_PRICE_IDS: Record<string, string> = {
  solo_monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || "price_solo_month",
  solo_annual: process.env.STRIPE_PRICE_SOLO_ANNUAL || "price_solo_year",
  professional_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_month",
  professional_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "price_pro_year",
  studio_monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY || "price_studio_month",
  studio_annual: process.env.STRIPE_PRICE_STUDIO_ANNUAL || "price_studio_year",
};

export function resolveSaasPriceId(tier: SaasTier, interval: BillingInterval): string | null {
  const key = `${tier}_${interval === "year" ? "annual" : "monthly"}`;
  const priceId = SAAS_PRICE_IDS[key];
  return priceId && priceId.length > 0 ? priceId : null;
}
