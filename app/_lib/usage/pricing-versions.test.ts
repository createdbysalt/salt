import { describe, expect, it } from "vitest";

import {
  CURRENT_PRICING_VERSION,
  getPricingVersion,
  isPricingVersionId,
  PRICING_VERSIONS,
} from "./pricing-versions";
import { getTierCapacity, listPricingVersionIds, resolvePlaysIncluded } from "./tiers";

describe("pricing version catalog", () => {
  it("has a current version that exists", () => {
    expect(PRICING_VERSIONS[CURRENT_PRICING_VERSION]).toBeDefined();
    expect(PRICING_VERSIONS[CURRENT_PRICING_VERSION].id).toBe(CURRENT_PRICING_VERSION);
  });

  it("declares every tier in every version", () => {
    for (const version of Object.values(PRICING_VERSIONS)) {
      for (const tier of ["starter", "pro", "max", "enterprise"] as const) {
        expect(version.tiers[tier]?.tier).toBe(tier);
      }
    }
  });

  it("keeps each tier's id consistent with its catalog key", () => {
    for (const version of Object.values(PRICING_VERSIONS)) {
      for (const [key, capacity] of Object.entries(version.tiers)) {
        expect(capacity.tier).toBe(key);
      }
    }
  });

  /**
   * Grandfathering depends on old versions remaining resolvable. A subscription
   * row pointing at a deleted version cannot be reconstructed, so removing one
   * silently re-prices whoever was on it.
   */
  it("never drops a shipped version", () => {
    expect(listPricingVersionIds()).toEqual(expect.arrayContaining(["2026-08"]));
  });

  it("is frozen against accidental mutation", () => {
    expect(Object.isFrozen(PRICING_VERSIONS)).toBe(true);
  });
});

describe("isPricingVersionId", () => {
  it("accepts shipped versions and rejects anything else", () => {
    expect(isPricingVersionId("2026-08")).toBe(true);
    expect(isPricingVersionId("2030-01")).toBe(false);
    expect(isPricingVersionId(null)).toBe(false);
    expect(isPricingVersionId(42)).toBe(false);
  });
});

describe("getPricingVersion", () => {
  it("resolves a known version", () => {
    expect(getPricingVersion("2026-08").id).toBe("2026-08");
  });

  it("falls back to current for null or undefined", () => {
    expect(getPricingVersion(null).id).toBe(CURRENT_PRICING_VERSION);
    expect(getPricingVersion(undefined).id).toBe(CURRENT_PRICING_VERSION);
  });

  it("falls back loudly for an unknown version rather than guessing quietly", () => {
    const errors: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => void errors.push(args);

    try {
      expect(getPricingVersion("1999-01").id).toBe(CURRENT_PRICING_VERSION);
    } finally {
      console.error = original;
    }

    expect(errors).toHaveLength(1);
    expect(String(errors[0]?.[0])).toContain("1999-01");
  });
});

/**
 * The whole point of versioning: a workspace pinned to an older version must
 * keep the capacity it was sold, even after the catalog moves on. With one
 * version shipped these assert the plumbing carries the version through; they
 * become genuine regression tests the moment a second version exists.
 */
describe("version-scoped capacity", () => {
  it("resolves capacity through the requested version", () => {
    const launch = PRICING_VERSIONS["2026-08"];
    expect(getTierCapacity("pro", "2026-08").playsIncluded).toBe(
      launch.tiers.pro.playsIncluded,
    );
  });

  it("resolves bundle size through the requested version", () => {
    const launch = PRICING_VERSIONS["2026-08"];
    expect(resolvePlaysIncluded("starter", null, "2026-08")).toBe(
      launch.tiers.starter.playsIncluded,
    );
  });

  it("lets a one-off override beat the version's bundle", () => {
    expect(resolvePlaysIncluded("starter", 500, "2026-08")).toBe(500);
  });

  it("still shrinks an unknown tier to starter within a version", () => {
    expect(getTierCapacity("nonsense", "2026-08").tier).toBe("starter");
  });
});
