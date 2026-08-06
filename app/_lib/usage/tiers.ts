import {
  CURRENT_PRICING_VERSION,
  getPricingVersion,
  PRICING_VERSIONS,
  type PricingVersionId,
} from "./pricing-versions";
import type { TierCapacity, WorkspaceTier } from "./types";

/**
 * Tier capacity accessors.
 *
 * Every lookup is scoped to a pricing version. Callers that resolve a real
 * workspace MUST pass the version from its subscription row — omitting it
 * silently prices that workspace at today's catalog, which is the exact bug
 * versioning exists to prevent. The default is for signup and marketing paths,
 * where "current" is genuinely what is meant.
 *
 * To change pricing, add a version in `pricing-versions.ts`. Never edit one.
 */

export type { TierCapacity } from "./types";
export {
  CURRENT_PRICING_VERSION,
  getPricingVersion,
  isPricingVersionId,
  PRICING_VERSIONS,
  type PricingVersion,
  type PricingVersionId,
} from "./pricing-versions";

/**
 * Current-version catalog.
 *
 * For display and signup only. Anything resolving an existing workspace's
 * entitlement must go through `getTierCapacity(tier, version)` instead.
 */
export const TIER_CATALOG: Record<WorkspaceTier, TierCapacity> =
  PRICING_VERSIONS[CURRENT_PRICING_VERSION].tiers;

/** Overage price per play past the bundle, current version, in cents (G5). */
export const OVERAGE_PLAY_PRICE_CENTS =
  PRICING_VERSIONS[CURRENT_PRICING_VERSION].overagePlayPriceCents;

/** Tier ladder, cheapest first. Drives upgrade paths and the G5 overage cap. */
export const TIER_LADDER: readonly WorkspaceTier[] = [
  "starter",
  "pro",
  "max",
  "enterprise",
] as const;

export function isWorkspaceTier(value: unknown): value is WorkspaceTier {
  return (
    typeof value === "string" &&
    value in PRICING_VERSIONS[CURRENT_PRICING_VERSION].tiers
  );
}

/** Falls back to Starter so a malformed tier can never grant extra capacity. */
export function getTierCapacity(
  tier: string | null | undefined,
  version?: string | null,
): TierCapacity {
  const tiers = getPricingVersion(version ?? CURRENT_PRICING_VERSION).tiers;
  return isWorkspaceTier(tier) ? tiers[tier] : tiers.starter;
}

/** Overage price per play for a given pricing version. */
export function getOveragePlayPriceCents(version?: string | null): number {
  return getPricingVersion(version ?? CURRENT_PRICING_VERSION).overagePlayPriceCents;
}

/**
 * Bundle size for a workspace. The override wins when present, which is how
 * one-off and enterprise deals keep capacity across catalog changes.
 *
 * Ordinary grandfathering does not need an override: a workspace pinned to an
 * older `pricing_version` already resolves that version's bundle.
 */
export function resolvePlaysIncluded(
  tier: string | null | undefined,
  override: number | null | undefined,
  version?: string | null,
): number {
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return Math.floor(override);
  }
  return getTierCapacity(tier, version).playsIncluded;
}

/** The next rung up, or null at the top of the ladder. */
export function getNextTier(tier: WorkspaceTier): WorkspaceTier | null {
  const index = TIER_LADDER.indexOf(tier);
  if (index === -1 || index >= TIER_LADDER.length - 1) return null;
  return TIER_LADDER[index + 1] ?? null;
}

/**
 * G5 overage ceiling: accrued overage may never exceed the price delta to the
 * next tier. Reaching it auto-upgrades the workspace for the month instead of
 * continuing to bill, which is what makes the predictability promise hold.
 *
 * Resolved within a single pricing version — comparing a grandfathered price
 * against a current one would produce a nonsensical cap.
 *
 * Returns null at the top of the ladder, where no cap is defined.
 */
export function getOverageCapCents(
  tier: WorkspaceTier,
  version?: string | null,
): number | null {
  const next = getNextTier(tier);
  if (!next) return null;

  const tiers = getPricingVersion(version ?? CURRENT_PRICING_VERSION).tiers;
  const delta = tiers[next].monthlyPriceCents - tiers[tier].monthlyPriceCents;
  return delta > 0 ? delta : null;
}

/** All pricing version ids, oldest first. */
export function listPricingVersionIds(): PricingVersionId[] {
  return (Object.keys(PRICING_VERSIONS) as PricingVersionId[]).sort();
}
