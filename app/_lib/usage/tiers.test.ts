import { describe, expect, it } from "vitest";

import {
  getNextTier,
  getOverageCapCents,
  getTierCapacity,
  isWorkspaceTier,
  resolvePlaysIncluded,
  TIER_CATALOG,
} from "./tiers";

describe("tier catalog", () => {
  it("matches the published bundle sizes", () => {
    expect(TIER_CATALOG.starter.playsIncluded).toBe(25);
    expect(TIER_CATALOG.pro.playsIncluded).toBe(100);
    expect(TIER_CATALOG.max.playsIncluded).toBe(300);
  });

  it("matches the published prices", () => {
    expect(TIER_CATALOG.starter.monthlyPriceCents).toBe(2900);
    expect(TIER_CATALOG.pro.monthlyPriceCents).toBe(7900);
    expect(TIER_CATALOG.max.monthlyPriceCents).toBe(14900);
  });

  it("prices annual at one month free", () => {
    for (const tier of ["starter", "pro", "max"] as const) {
      const { monthlyPriceCents, annualPriceCents } = TIER_CATALOG[tier];
      expect(annualPriceCents).toBe(monthlyPriceCents * 10);
    }
  });
});

describe("isWorkspaceTier", () => {
  it("accepts known tiers", () => {
    expect(isWorkspaceTier("starter")).toBe(true);
    expect(isWorkspaceTier("enterprise")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isWorkspaceTier("unlimited")).toBe(false);
    expect(isWorkspaceTier(null)).toBe(false);
    expect(isWorkspaceTier(42)).toBe(false);
  });
});

describe("getTierCapacity", () => {
  // A malformed tier must shrink capacity, never grant it.
  it("falls back to starter for unknown, null, and undefined tiers", () => {
    expect(getTierCapacity("nonsense").tier).toBe("starter");
    expect(getTierCapacity(null).tier).toBe("starter");
    expect(getTierCapacity(undefined).tier).toBe("starter");
  });
});

describe("resolvePlaysIncluded", () => {
  it("uses the catalog when no override is set", () => {
    expect(resolvePlaysIncluded("pro", null)).toBe(100);
  });

  it("lets a grandfathering override win", () => {
    expect(resolvePlaysIncluded("starter", 500)).toBe(500);
  });

  it("allows a zero override", () => {
    expect(resolvePlaysIncluded("pro", 0)).toBe(0);
  });

  it("ignores negative and non-finite overrides", () => {
    expect(resolvePlaysIncluded("pro", -10)).toBe(100);
    expect(resolvePlaysIncluded("pro", Number.NaN)).toBe(100);
    expect(resolvePlaysIncluded("pro", Number.POSITIVE_INFINITY)).toBe(100);
  });

  it("floors fractional overrides", () => {
    expect(resolvePlaysIncluded("pro", 42.9)).toBe(42);
  });
});

describe("getNextTier", () => {
  it("walks the ladder", () => {
    expect(getNextTier("starter")).toBe("pro");
    expect(getNextTier("pro")).toBe("max");
    expect(getNextTier("max")).toBe("enterprise");
  });

  it("returns null at the top", () => {
    expect(getNextTier("enterprise")).toBeNull();
  });
});

describe("getOverageCapCents", () => {
  // G5: accrued overage may never exceed the price delta to the next tier.
  it("equals the delta to the next tier", () => {
    expect(getOverageCapCents("starter")).toBe(5000);
    expect(getOverageCapCents("pro")).toBe(7000);
  });

  it("returns null where no priced next rung exists", () => {
    expect(getOverageCapCents("max")).toBeNull();
    expect(getOverageCapCents("enterprise")).toBeNull();
  });
});
