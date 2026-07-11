import { describe, it, expect, vi } from "vitest";
import {
  matchFieldMultiTier,
  matchAllFieldsMultiTier,
  computeTierStats,
  formatTierStats,
} from "./multi-tier";

describe("matchFieldMultiTier", () => {
  const mockEmbedFn = vi.fn(async (text: string) => {
    const embeddings: Record<string, number[]> = {
      customer_email: [0.9, 0.1, 0.0],
      email: [0.85, 0.15, 0.0],
      client_contact: [0.8, 0.15, 0.05],
      phone: [0.1, 0.9, 0.0],
      name: [0.0, 0.1, 0.9],
    };
    return embeddings[text] ?? [0.33, 0.33, 0.33];
  });

  it("matches with deterministic tier first", async () => {
    const result = await matchFieldMultiTier("email", ["email", "phone", "name"]);

    expect(result.tier).toBe("deterministic");
    expect(result.targetField).toBe("email");
    expect(result.confidence).toBeCloseTo(0.99);
    expect(result.tiersAttempted).toContain("deterministic");
  });

  it("falls back to fuzzy tier when no deterministic match", async () => {
    const result = await matchFieldMultiTier("customer_email", ["email", "phone", "name"]);

    expect(result.tier).toBe("fuzzy");
    expect(result.targetField).toBe("email");
    expect(result.tiersAttempted).toContain("deterministic");
    expect(result.tiersAttempted).toContain("fuzzy");
  });

  it("falls back to semantic tier when no fuzzy match", async () => {
    const result = await matchFieldMultiTier(
      "client_contact",
      ["email", "phone", "name"],
      mockEmbedFn,
      { fuzzyThreshold: 0.99 }
    );

    expect(result.tier).toBe("semantic");
    expect(result.tiersAttempted).toContain("semantic");
  });

  it("returns no match when all tiers fail", async () => {
    const result = await matchFieldMultiTier(
      "zzzzzzz",
      ["email", "phone"],
      mockEmbedFn,
      { semanticThreshold: 0.99 }
    );

    expect(result.tier).toBe("none");
    expect(result.targetField).toBe("");
    expect(result.confidence).toBe(0);
  });

  it("skips semantic tier when embedFn not provided", async () => {
    const result = await matchFieldMultiTier(
      "unknown_field",
      ["email", "phone"],
      undefined,
      { fuzzyThreshold: 0.99 }
    );

    expect(result.tiersAttempted).not.toContain("semantic");
  });

  it("skips semantic tier when disabled", async () => {
    const result = await matchFieldMultiTier(
      "unknown_field",
      ["email", "phone"],
      mockEmbedFn,
      { enableSemantic: false, fuzzyThreshold: 0.99 }
    );

    expect(result.tiersAttempted).not.toContain("semantic");
  });
});

describe("matchAllFieldsMultiTier", () => {
  it("matches multiple fields without duplicating targets", async () => {
    const results = await matchAllFieldsMultiTier(
      ["email", "customer_email", "phone_number"],
      ["email", "phone", "name"]
    );

    expect(results.size).toBe(3);

    const emailMatch = results.get("email");
    expect(emailMatch?.targetField).toBe("email");

    const customerEmailMatch = results.get("customer_email");
    expect(customerEmailMatch?.targetField).not.toBe("email");
  });

  it("prioritizes deterministic matches", async () => {
    const results = await matchAllFieldsMultiTier(
      ["customer_email", "email"],
      ["email"]
    );

    const emailMatch = results.get("email");
    expect(emailMatch?.tier).toBe("deterministic");
    expect(emailMatch?.targetField).toBe("email");

    const customerEmailMatch = results.get("customer_email");
    expect(customerEmailMatch?.tier).toBe("none");
    expect(customerEmailMatch?.targetField).toBe("");
  });
});

describe("computeTierStats", () => {
  it("counts matches by tier", async () => {
    const results = await matchAllFieldsMultiTier(
      ["email", "customer_name", "unknown_xyz"],
      ["email", "name", "phone"]
    );

    const stats = computeTierStats(results);

    expect(stats.total).toBe(3);
    expect(stats.deterministic).toBeGreaterThanOrEqual(1);
  });
});

describe("formatTierStats", () => {
  it("formats stats as readable string", () => {
    const stats = {
      deterministic: 5,
      fuzzy: 3,
      semantic: 1,
      none: 1,
      total: 10,
    };

    const formatted = formatTierStats(stats);

    expect(formatted).toContain("Total fields: 10");
    expect(formatted).toContain("Deterministic: 5");
    expect(formatted).toContain("50%");
  });
});
