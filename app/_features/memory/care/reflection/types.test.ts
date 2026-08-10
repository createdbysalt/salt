import { describe, it, expect } from "vitest";
import {
  buildCategory,
  parseCategory,
  calculateWeight,
  REFLECTION_CONFIG,
} from "./types";

describe("buildCategory", () => {
  it("combines signal source and field type with colon", () => {
    expect(buildCategory("email_signature", "role")).toBe("email_signature:role");
  });

  it("handles empty strings", () => {
    expect(buildCategory("", "role")).toBe(":role");
    expect(buildCategory("email_signature", "")).toBe("email_signature:");
  });
});

describe("parseCategory", () => {
  it("splits category into signal source and field type", () => {
    const result = parseCategory("email_signature:role");
    expect(result.signalSource).toBe("email_signature");
    expect(result.fieldType).toBe("role");
  });

  it("handles missing field type", () => {
    const result = parseCategory("email_signature");
    expect(result.signalSource).toBe("email_signature");
    expect(result.fieldType).toBe("");
  });

  it("handles empty string", () => {
    const result = parseCategory("");
    expect(result.signalSource).toBe("");
    expect(result.fieldType).toBe("");
  });

  it("handles multiple colons (takes first split)", () => {
    const result = parseCategory("email:signature:role");
    expect(result.signalSource).toBe("email");
    expect(result.fieldType).toBe("signature");
  });
});

describe("calculateWeight", () => {
  it("returns 1.0 for zero corrections", () => {
    expect(calculateWeight(0)).toBe(1.0);
  });

  it("reduces weight by 0.1 per correction", () => {
    expect(calculateWeight(1)).toBe(0.9);
    expect(calculateWeight(2)).toBe(0.8);
    expect(calculateWeight(3)).toBe(0.7);
  });

  it("floors at 0.5 (WEIGHT_FLOOR)", () => {
    expect(calculateWeight(5)).toBe(0.5);
    expect(calculateWeight(6)).toBe(0.5);
    expect(calculateWeight(10)).toBe(0.5);
    expect(calculateWeight(100)).toBe(0.5);
  });

  it("matches REFLECTION_CONFIG constants", () => {
    const { WEIGHT_FLOOR, WEIGHT_CEILING, WEIGHT_DECAY_PER_CORRECTION } = REFLECTION_CONFIG;

    expect(WEIGHT_FLOOR).toBe(0.5);
    expect(WEIGHT_CEILING).toBe(1.0);
    expect(WEIGHT_DECAY_PER_CORRECTION).toBe(0.1);
  });
});

describe("REFLECTION_CONFIG", () => {
  it("has trigger threshold of 5", () => {
    expect(REFLECTION_CONFIG.TRIGGER_THRESHOLD).toBe(5);
  });

  it("has minimum cluster size of 3", () => {
    expect(REFLECTION_CONFIG.MIN_CLUSTER_SIZE).toBe(3);
  });
});
