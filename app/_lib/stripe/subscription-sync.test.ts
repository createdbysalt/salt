import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("./saas-price-ids", () => ({
  SAAS_PRICE_IDS: {
    starter_monthly: "price_starter_m",
    starter_annual: "price_starter_y",
    pro_monthly: "price_pro_m",
    pro_annual: "price_pro_y",
    max_monthly: "price_max_m",
    max_annual: "price_max_y",
  },
}));

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { CURRENT_PRICING_VERSION } from "@/app/_lib/usage/pricing-versions";

import {
  mapStripeStatus,
  resolveCheckoutTier,
  resolveTierFromPriceId,
  resolveTierFromStripe,
  syncWorkspaceSubscription,
} from "./subscription-sync";

describe("mapStripeStatus", () => {
  it("passes through statuses Salt models directly", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("trialing")).toBe("trialing");
    expect(mapStripeStatus("canceled")).toBe("canceled");
  });

  it("collapses statuses Salt does not model to the nearest equivalent", () => {
    expect(mapStripeStatus("unpaid")).toBe("past_due");
    expect(mapStripeStatus("incomplete_expired")).toBe("canceled");
  });

  it("maps an unrecognised status to incomplete", () => {
    expect(mapStripeStatus("something_new")).toBe("incomplete");
  });
});

describe("resolveTierFromStripe", () => {
  it("uses checkout metadata when it names a known tier", () => {
    expect(resolveTierFromStripe("max")).toBe("max");
  });

  it("falls back to price metadata", () => {
    expect(resolveTierFromStripe(null, "pro")).toBe("pro");
  });

  // An ambiguous checkout must never hand out the largest bundle.
  it("falls back to starter for unknown, missing, and forged values", () => {
    expect(resolveTierFromStripe("unlimited")).toBe("starter");
    expect(resolveTierFromStripe(null)).toBe("starter");
    expect(resolveTierFromStripe(undefined, "not-a-tier")).toBe("starter");
  });
});

describe("resolveTierFromPriceId", () => {
  it("recovers the tier from a configured monthly price", () => {
    expect(resolveTierFromPriceId("price_pro_m")).toBe("pro");
  });

  it("recovers the tier from a configured annual price", () => {
    expect(resolveTierFromPriceId("price_max_y")).toBe("max");
  });

  // Null leaves the stored tier untouched — an unknown price is not a downgrade.
  it("returns null for an unknown or missing price", () => {
    expect(resolveTierFromPriceId("price_something_else")).toBeNull();
    expect(resolveTierFromPriceId(null)).toBeNull();
    expect(resolveTierFromPriceId(undefined)).toBeNull();
  });
});

describe("resolveCheckoutTier (INV-5)", () => {
  it("grants the tier the customer actually paid for", () => {
    expect(resolveCheckoutTier("price_pro_m", "pro")).toEqual({
      tier: "pro",
      metadataMismatch: false,
    });
  });

  // The tamper case: a checkout session created with metadata claiming Max
  // but a Starter price must grant Starter — the price is the truth.
  it("price wins when metadata claims a larger bundle", () => {
    expect(resolveCheckoutTier("price_starter_m", "max")).toEqual({
      tier: "starter",
      metadataMismatch: true,
    });
  });

  it("flags metadata naming a smaller bundle too (config drift, not attack)", () => {
    expect(resolveCheckoutTier("price_max_y", "starter")).toEqual({
      tier: "max",
      metadataMismatch: true,
    });
  });

  it("absent metadata is not a mismatch", () => {
    expect(resolveCheckoutTier("price_max_m", null)).toEqual({
      tier: "max",
      metadataMismatch: false,
    });
    expect(resolveCheckoutTier("price_max_m", undefined)).toEqual({
      tier: "max",
      metadataMismatch: false,
    });
  });

  // Fail closed: an unknown price grants nothing, whatever metadata says.
  it("returns null for an unknown price even with plausible metadata", () => {
    expect(resolveCheckoutTier("price_something_else", "max")).toBeNull();
    expect(resolveCheckoutTier(null, "pro")).toBeNull();
  });
});

interface UpsertedRow {
  workspace_id: string;
  pricing_version: string;
  tier: string;
}

/**
 * Minimal stand-in for the three calls sync makes: load owned workspaces, read
 * stored pricing versions, upsert entitlement.
 */
function createSupabaseStub(options: {
  workspaceIds: string[];
  storedVersions?: { workspace_id: string; pricing_version: string }[];
  versionReadError?: string;
}) {
  const upserts: UpsertedRow[][] = [];

  const client = {
    from(table: string) {
      if (table === "workspaces") {
        return {
          select: () => ({
            eq: () => ({
              data: options.workspaceIds.map((id) => ({ id })),
              error: null,
            }),
          }),
        };
      }

      return {
        select: () => ({
          in: () => ({
            data: options.storedVersions ?? [],
            error: options.versionReadError
              ? { message: options.versionReadError }
              : null,
          }),
        }),
        upsert: (rows: UpsertedRow[]) => {
          upserts.push(rows);
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, upserts };
}

const subscription = {
  id: "sub_1",
  customer: "cus_1",
  status: "active",
  cancel_at_period_end: false,
  trial_end: null,
  current_period_start: 1_760_000_000,
  current_period_end: 1_762_000_000,
  items: { data: [{ price: { id: "price_pro_m", recurring: { interval: "month" } } }] },
} as unknown as Stripe.Subscription;

/**
 * Grandfathering is only real if a replayed webhook cannot quietly undo it.
 * Sync upserts, so every column it sends overwrites — these pin the one column
 * that must not.
 */
describe("syncWorkspaceSubscription pricing version", () => {
  it("stamps the current version on a workspace's first subscription", async () => {
    const { client, upserts } = createSupabaseStub({ workspaceIds: ["ws_new"] });

    await syncWorkspaceSubscription({
      supabase: client,
      userId: "user_1",
      subscription,
      tier: "pro",
    });

    expect(upserts[0]?.[0]?.pricing_version).toBe(CURRENT_PRICING_VERSION);
  });

  it("preserves a grandfathered version instead of moving it to current", async () => {
    const { client, upserts } = createSupabaseStub({
      workspaceIds: ["ws_old"],
      storedVersions: [{ workspace_id: "ws_old", pricing_version: "1999-01" }],
    });

    await syncWorkspaceSubscription({
      supabase: client,
      userId: "user_1",
      subscription,
      tier: "pro",
    });

    expect(upserts[0]?.[0]?.pricing_version).toBe("1999-01");
    // The tier still syncs — an upgrade must apply within the old pricing.
    expect(upserts[0]?.[0]?.tier).toBe("pro");
  });

  it("preserves each workspace's own version when a user owns several", async () => {
    const { client, upserts } = createSupabaseStub({
      workspaceIds: ["ws_old", "ws_new"],
      storedVersions: [{ workspace_id: "ws_old", pricing_version: "1999-01" }],
    });

    await syncWorkspaceSubscription({
      supabase: client,
      userId: "user_1",
      subscription,
      tier: "pro",
    });

    const byId = new Map(upserts[0]?.map((row) => [row.workspace_id, row.pricing_version]));
    expect(byId.get("ws_old")).toBe("1999-01");
    expect(byId.get("ws_new")).toBe(CURRENT_PRICING_VERSION);
  });

  // Failing open would stamp current pricing over a grandfathered row, which is
  // the exact outcome the read exists to prevent. Throwing makes Stripe retry.
  it("throws rather than writing when stored versions cannot be read", async () => {
    const { client, upserts } = createSupabaseStub({
      workspaceIds: ["ws_old"],
      versionReadError: "connection reset",
    });

    await expect(
      syncWorkspaceSubscription({
        supabase: client,
        userId: "user_1",
        subscription,
        tier: "pro",
      }),
    ).rejects.toThrow(/pricing versions/i);

    expect(upserts).toHaveLength(0);
  });
});
