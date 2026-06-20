import { describe, expect, it } from "vitest";
import { resolveHeroShowPreview } from "./resolve-hero-show-preview";

describe("resolveHeroShowPreview", () => {
  it("defaults to true when unset", () => {
    expect(resolveHeroShowPreview(undefined)).toBe(true);
    expect(resolveHeroShowPreview({})).toBe(true);
  });

  it("respects explicit false for segment landings", () => {
    expect(resolveHeroShowPreview({ heroShowPreview: false })).toBe(false);
  });

  it("respects explicit true", () => {
    expect(resolveHeroShowPreview({ heroShowPreview: true })).toBe(true);
  });
});
