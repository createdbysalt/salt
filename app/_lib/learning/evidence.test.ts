import { describe, it, expect } from "vitest";
import {
  computeCorroboratedConfidence,
  valuesContradict,
  getFieldTtl,
  FIELD_TTL_DAYS,
} from "./evidence-accumulator";

describe("computeCorroboratedConfidence", () => {
  it("returns base confidence for single observation", () => {
    const result = computeCorroboratedConfidence(30, 1, 1);
    // Single observation should add minimal boost
    expect(result).toBeGreaterThanOrEqual(30);
    expect(result).toBeLessThan(40);
  });

  it("increases confidence with more observations", () => {
    const single = computeCorroboratedConfidence(30, 1, 1);
    const double = computeCorroboratedConfidence(30, 2, 1);
    const triple = computeCorroboratedConfidence(30, 3, 1);

    expect(double).toBeGreaterThan(single);
    expect(triple).toBeGreaterThan(double);
  });

  it("shows diminishing returns", () => {
    const boost2to3 = computeCorroboratedConfidence(30, 3, 1) - computeCorroboratedConfidence(30, 2, 1);
    const boost9to10 = computeCorroboratedConfidence(30, 10, 1) - computeCorroboratedConfidence(30, 9, 1);

    // Later additions should add less
    expect(boost9to10).toBeLessThan(boost2to3);
  });

  it("rewards source diversity", () => {
    const sameSource = computeCorroboratedConfidence(30, 3, 1);
    const diverseSources = computeCorroboratedConfidence(30, 3, 3);

    expect(diverseSources).toBeGreaterThan(sameSource);
  });

  it("caps at 95 to preserve epistemic humility", () => {
    const result = computeCorroboratedConfidence(80, 100, 10);
    expect(result).toBeLessThanOrEqual(95);
  });

  it("produces reasonable confidence progression", () => {
    // Verify the progression is sensible, not exact values
    const base = 30;
    const c2 = computeCorroboratedConfidence(base, 2, 1);
    const c3 = computeCorroboratedConfidence(base, 3, 1);
    const c3diverse = computeCorroboratedConfidence(base, 3, 2);
    const c5diverse = computeCorroboratedConfidence(base, 5, 3);

    // 2 observations should be around 35-45
    expect(c2).toBeGreaterThan(35);
    expect(c2).toBeLessThan(45);

    // 3 observations should be higher
    expect(c3).toBeGreaterThan(c2);

    // Diverse sources should boost more
    expect(c3diverse).toBeGreaterThan(c3);

    // 5 diverse observations should be substantially higher
    expect(c5diverse).toBeGreaterThan(50);
    expect(c5diverse).toBeLessThan(70);
  });
});

describe("valuesContradict", () => {
  it("returns false for null values", () => {
    expect(valuesContradict(null, "client")).toBe(false);
    expect(valuesContradict("client", null)).toBe(false);
    expect(valuesContradict(null, null)).toBe(false);
  });

  it("returns false for equal values", () => {
    expect(valuesContradict("client", "client")).toBe(false);
    expect(valuesContradict(42, 42)).toBe(false);
    expect(valuesContradict({ a: 1 }, { a: 1 })).toBe(false);
  });

  it("returns true for different values", () => {
    expect(valuesContradict("client", "lead")).toBe(true);
    expect(valuesContradict(42, 43)).toBe(true);
    expect(valuesContradict({ a: 1 }, { a: 2 })).toBe(true);
  });
});

describe("getFieldTtl", () => {
  it("uses configured TTL values", () => {
    // Check that the function returns values from FIELD_TTL_DAYS
    expect(FIELD_TTL_DAYS["email"]).toBeNull();
    expect(FIELD_TTL_DAYS["primary_email"]).toBeNull();
    expect(FIELD_TTL_DAYS["record_status"]).toBe(90);
    expect(FIELD_TTL_DAYS["role"]).toBe(30);
  });

  it("returns correct TTL for known fields", () => {
    expect(getFieldTtl("record_status")).toBe(90);
    expect(getFieldTtl("role")).toBe(30);
  });

  it("returns default for unknown fields", () => {
    expect(getFieldTtl("some_unknown_field")).toBe(FIELD_TTL_DAYS["_default"]);
  });
});
