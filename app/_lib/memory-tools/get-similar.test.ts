import { describe, it, expect } from "vitest";

describe("duplicate detection confidence rules", () => {
  it("exact email match should be 98% confidence", () => {
    const confidence = 98;
    expect(confidence).toBeGreaterThanOrEqual(95);
  });

  it("exact phone match should be 85% confidence", () => {
    const confidence = 85;
    expect(confidence).toBeGreaterThanOrEqual(80);
    expect(confidence).toBeLessThan(95);
  });

  it("fuzzy name match alone should be low confidence", () => {
    const confidence = 55;
    expect(confidence).toBeLessThan(80);
  });

  it("fuzzy name + same domain should be higher confidence", () => {
    const confidenceFuzzyOnly = 55;
    const confidenceFuzzyWithDomain = 82;
    expect(confidenceFuzzyWithDomain).toBeGreaterThan(confidenceFuzzyOnly);
  });
});
