import { describe, expect, it } from "vitest";

import { resolveScanCaptureCap } from "./capture-scan-cap";
import { getTierCapacity } from "./tiers";

describe("resolveScanCaptureCap", () => {
  it("gives a higher ceiling to tiers that pay for more capture budget", () => {
    const starter = resolveScanCaptureCap("starter");
    const pro = resolveScanCaptureCap("pro");
    const max = resolveScanCaptureCap("max");

    expect(starter).toBeLessThan(pro);
    expect(pro).toBeLessThan(max);
  });

  it("never exceeds what the tier's capture budget can pay for", () => {
    // The cap exists to keep one click inside the budget the workspace bought.
    // If it ever resolves above that, the derivation has inverted and the
    // ceiling is no longer a ceiling.
    for (const tier of ["starter", "pro", "max"] as const) {
      const capacity = getTierCapacity(tier);
      const cap = resolveScanCaptureCap(tier);

      expect(cap).toBeLessThanOrEqual(capacity.captureBudgetMicros);
    }
  });

  it("returns a finite, positive ceiling for every tier", () => {
    for (const tier of ["starter", "pro", "max", "enterprise"] as const) {
      const cap = resolveScanCaptureCap(tier);

      expect(Number.isFinite(cap)).toBe(true);
      expect(cap).toBeGreaterThan(0);
    }
  });

  it("falls back to the starter ceiling for an unrecognised tier", () => {
    // getTierCapacity resolves unknown tiers to starter rather than throwing,
    // so a corrupt subscription row scans conservatively instead of failing.
    expect(resolveScanCaptureCap("nonsense")).toBe(
      resolveScanCaptureCap("starter"),
    );
    expect(resolveScanCaptureCap(null)).toBe(resolveScanCaptureCap("starter"));
  });

  it("still allows a usable scan if a tier's capture budget is misconfigured", () => {
    // A zeroed budget must not produce a zero cap: a scan that classifies
    // nothing reads as an outage rather than as throttling.
    expect(resolveScanCaptureCap("starter", "no-such-version")).toBeGreaterThan(
      0,
    );
  });
});
