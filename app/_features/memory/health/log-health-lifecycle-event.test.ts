import { describe, expect, it } from "vitest";
import {
  formatHealthLifecycleValue,
  healthCacheChanged,
} from "./log-health-lifecycle-event";

describe("formatHealthLifecycleValue", () => {
  it("formats score and band together", () => {
    expect(formatHealthLifecycleValue({ score: 72, band: "Watch" })).toBe("72 · Watch");
  });

  it("returns null when both are empty", () => {
    expect(formatHealthLifecycleValue({ score: null, band: null })).toBeNull();
  });
});

describe("healthCacheChanged", () => {
  it("detects band and score changes", () => {
    expect(
      healthCacheChanged(
        { score: 80, band: "Healthy" },
        { score: 80, band: "Healthy" },
      ),
    ).toBe(false);

    expect(
      healthCacheChanged(
        { score: 80, band: "Healthy" },
        { score: 55, band: "Watch" },
      ),
    ).toBe(true);
  });
});
