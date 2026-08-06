import type { TierCapacity, WorkspaceTier } from "./types";

/**
 * Versioned pricing catalog.
 *
 * Pricing is going to change. The proposal says so outright: the 25/100/300
 * bundles are placeholders held until 60–90 days of shadow metering, then reset
 * to each segment's observed percentile — with the launch cohort grandfathered.
 *
 * A single mutable catalog cannot express that. Editing a bundle size in place
 * silently re-prices every existing workspace on that tier: raise it and you
 * give away capacity you never sold, lower it and you quietly take capacity
 * from someone who is paying for it. Neither is recoverable after the fact,
 * because nothing recorded what the customer was originally promised.
 *
 * So the catalog is versioned and the workspace remembers which version it is
 * on (`workspace_subscriptions.pricing_version`). Changing pricing means adding
 * a version, never editing one. Existing customers are grandfathered by
 * construction rather than by a backfill someone has to remember to run, and
 * migrating a cohort becomes one explicit, auditable UPDATE.
 *
 * ## Changing pricing
 *
 * 1. Add a new entry here. **Never edit or delete an existing one** — old rows
 *    still point at it, and a deleted version cannot be reconstructed.
 * 2. Create the new prices in Stripe and add their IDs to the env (see
 *    `app/_lib/stripe/saas-price-ids.ts`). Stripe prices are immutable too.
 * 3. Point `CURRENT_PRICING_VERSION` at the new id. New signups get it; every
 *    existing workspace keeps the version stamped on its subscription row.
 * 4. Decide, deliberately, whether to migrate existing cohorts. Doing nothing
 *    grandfathers everyone, which is the safe default.
 * 5. Update `brand-identity/product/pricing-tiers.md` (customer copy) and the
 *    published-numbers test in `tiers.test.ts`.
 *
 * Full procedure: `docs/architecture/billing-metering.md`.
 */

/** Immutable once shipped. Add versions; never edit or remove one. */
export type PricingVersionId = "2026-08";

export interface PricingVersion {
  id: PricingVersionId;
  /** When this version began applying to new signups (ISO date). */
  effectiveFrom: string;
  /** Why this version exists — read by whoever is debugging a customer's bill. */
  note: string;
  tiers: Record<WorkspaceTier, TierCapacity>;
  /** Price per play past the bundle, in whole US cents (G5). */
  overagePlayPriceCents: number;
}

const GB = 1024 * 1024 * 1024;

/**
 * Launch pricing. Bundles are placeholders pending shadow-metering data (§4);
 * tiers differ on capacity only, with no feature gates.
 */
const V2026_08: PricingVersion = {
  id: "2026-08",
  effectiveFrom: "2026-08-05",
  note: "Launch pricing. Bundles are placeholders until shadow metering sets them from observed percentiles.",
  overagePlayPriceCents: 75,
  tiers: {
    starter: {
      tier: "starter",
      label: "Starter",
      monthlyPriceCents: 2900,
      annualPriceCents: 29000,
      playsIncluded: 25,
      askSaltDailyLimit: 30,
      storageQuotaBytes: 5 * GB,
      connectedSeatsIncluded: 1,
      captureBudgetMicros: 6_000_000,
    },
    pro: {
      tier: "pro",
      label: "Pro",
      monthlyPriceCents: 7900,
      annualPriceCents: 79000,
      playsIncluded: 100,
      askSaltDailyLimit: 75,
      storageQuotaBytes: 25 * GB,
      connectedSeatsIncluded: 3,
      captureBudgetMicros: 12_000_000,
    },
    max: {
      tier: "max",
      label: "Max",
      monthlyPriceCents: 14900,
      annualPriceCents: 149000,
      playsIncluded: 300,
      askSaltDailyLimit: 150,
      storageQuotaBytes: 100 * GB,
      connectedSeatsIncluded: 5,
      captureBudgetMicros: 20_000_000,
    },
    // Deferred until demand appears; the ICP is solo operators. Present so tier
    // resolution never throws on a subscription row written by a manual deal.
    enterprise: {
      tier: "enterprise",
      label: "Enterprise",
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      playsIncluded: 1000,
      askSaltDailyLimit: 500,
      storageQuotaBytes: 500 * GB,
      connectedSeatsIncluded: 10,
      captureBudgetMicros: 60_000_000,
    },
  },
};

export const PRICING_VERSIONS: Readonly<Record<PricingVersionId, PricingVersion>> =
  Object.freeze({
    "2026-08": V2026_08,
  });

/** What new signups get. Bump when a new version ships. */
export const CURRENT_PRICING_VERSION: PricingVersionId = "2026-08";

export function isPricingVersionId(value: unknown): value is PricingVersionId {
  return typeof value === "string" && value in PRICING_VERSIONS;
}

/**
 * Resolve a workspace's pricing version.
 *
 * Every subscription row carries a version (the column is NOT NULL with a
 * default), so an unrecognised value means a version was deleted from code
 * while rows still referenced it. That is a bug with billing consequences, not
 * a condition to absorb quietly — it is loud here and cannot be silent.
 */
export function getPricingVersion(id: string | null | undefined): PricingVersion {
  if (isPricingVersionId(id)) return PRICING_VERSIONS[id];

  if (id) {
    console.error(
      `[usage] unknown pricing version "${id}" — falling back to ${CURRENT_PRICING_VERSION}. ` +
        "A shipped pricing version was removed while subscriptions still referenced it.",
    );
  }
  return PRICING_VERSIONS[CURRENT_PRICING_VERSION];
}
