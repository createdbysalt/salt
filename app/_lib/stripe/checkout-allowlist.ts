import "server-only";

import config from "@/config";

export type LegacyCheckoutPlanKey = "starter" | "advanced";

const LEGACY_PLAN_KEYS: readonly LegacyCheckoutPlanKey[] = ["starter", "advanced"];

const LEGACY_PRICE_BY_KEY: Record<LegacyCheckoutPlanKey, string> = {
  starter: config.stripe.plans[0]?.priceId ?? "",
  advanced: config.stripe.plans[1]?.priceId ?? "",
};

/**
 * Resolve a server-known plan key to an allowed Stripe Price ID.
 * Rejects arbitrary client-supplied price IDs.
 */
export function resolveLegacyCheckoutPriceId(planKey: string | null | undefined): string | null {
  if (!planKey) return null;
  if (!LEGACY_PLAN_KEYS.includes(planKey as LegacyCheckoutPlanKey)) return null;
  const priceId = LEGACY_PRICE_BY_KEY[planKey as LegacyCheckoutPlanKey];
  return priceId && priceId.length > 0 ? priceId : null;
}

export function isAllowedLegacyCheckoutPriceId(priceId: string): boolean {
  return Object.values(LEGACY_PRICE_BY_KEY).includes(priceId);
}

export function listLegacyCheckoutPlanKeys(): readonly LegacyCheckoutPlanKey[] {
  return LEGACY_PLAN_KEYS;
}
