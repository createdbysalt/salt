import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/_lib/ai", () => ({
  sendLlm: vi.fn(),
}));

import { sendLlm } from "@/app/_lib/ai";
import {
  matchFieldFourTier,
  matchAllFieldsFourTier,
  computeFourTierStats,
  formatFourTierStats,
} from "./four-tier";

const mockSendLlm = vi.mocked(sendLlm);

const TEST_SPEND = {
  kind: "workspace",
  workspaceId: "ws-1",
  userId: "test-user",
} as const;

describe("matchFieldFourTier", () => {
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

  beforeEach(() => {
    mockSendLlm.mockClear();
    mockEmbedFn.mockClear();
  });

  it("matches with deterministic tier first", async () => {
    const result = await matchFieldFourTier("email", ["email", "phone", "name"]);

    expect(result.tier).toBe("deterministic");
    expect(result.targetField).toBe("email");
    expect(result.confidence).toBeCloseTo(0.99);
    expect(result.tiersAttempted).toContain("deterministic");
    expect(result.routing).toBe("auto_accept");
  });

  it("falls back to fuzzy tier when no deterministic match", async () => {
    const result = await matchFieldFourTier("customer_email", ["email", "phone", "name"]);

    expect(result.tier).toBe("fuzzy");
    expect(result.targetField).toBe("email");
    expect(result.tiersAttempted).toContain("deterministic");
    expect(result.tiersAttempted).toContain("fuzzy");
  });

  it("falls back to semantic tier when no fuzzy match", async () => {
    const result = await matchFieldFourTier(
      "client_contact",
      ["email", "phone", "name"],
      { embedFn: mockEmbedFn },
      { fuzzyThreshold: 0.99 }
    );

    expect(result.tier).toBe("semantic");
    expect(result.tiersAttempted).toContain("semantic");
  });

  it("falls back to LLM tier when enabled", async () => {
    mockSendLlm.mockResolvedValueOnce(
      JSON.stringify([
        { field: "email", value: "test@example.com", confidence: 0.85, evidence: "test@example.com" },
      ])
    );

    const result = await matchFieldFourTier(
      "contact_info",
      ["email", "phone"],
      {
        embedFn: mockEmbedFn,
        spend: TEST_SPEND,
        unstructuredText: "Contact: test@example.com",
      },
      { enableLlm: true, fuzzyThreshold: 0.99, semanticThreshold: 0.99 }
    );

    expect(result.tier).toBe("llm");
    expect(result.targetField).toBe("email");
    expect(result.value).toBe("test@example.com");
    expect(result.tiersAttempted).toContain("llm");
  });

  it("returns no match when all tiers fail", async () => {
    mockSendLlm.mockResolvedValueOnce("[]");

    const result = await matchFieldFourTier(
      "zzzzzzz",
      ["email", "phone"],
      { embedFn: mockEmbedFn, spend: TEST_SPEND, unstructuredText: "nothing" },
      { enableLlm: true, semanticThreshold: 0.99 }
    );

    expect(result.tier).toBe("none");
    expect(result.targetField).toBe("");
    expect(result.confidence).toBe(0);
    expect(result.routing).toBe("human_review");
  });

  it("skips LLM tier when disabled", async () => {
    const result = await matchFieldFourTier(
      "unknown_field",
      ["email", "phone"],
      { spend: TEST_SPEND, unstructuredText: "some text" },
      { enableLlm: false, fuzzyThreshold: 0.99 }
    );

    expect(result.tiersAttempted).not.toContain("llm");
    expect(mockSendLlm).not.toHaveBeenCalled();
  });

  it("skips LLM tier when spend is unattributable", async () => {
    const result = await matchFieldFourTier(
      "unknown_field",
      ["email", "phone"],
      { unstructuredText: "some text" },
      { enableLlm: true, fuzzyThreshold: 0.99 }
    );

    expect(result.tiersAttempted).not.toContain("llm");
  });

  it("includes routing decision in result", async () => {
    const result = await matchFieldFourTier("email", ["email"]);

    expect(result.routing).toBe("auto_accept");
  });
});

describe("matchAllFieldsFourTier", () => {
  it("matches multiple fields without duplicating targets", async () => {
    const results = await matchAllFieldsFourTier(
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
    const results = await matchAllFieldsFourTier(
      ["customer_email", "email"],
      ["email"]
    );

    const emailMatch = results.get("email");
    expect(emailMatch?.tier).toBe("deterministic");
    expect(emailMatch?.targetField).toBe("email");

    const customerEmailMatch = results.get("customer_email");
    expect(customerEmailMatch?.tier).toBe("none");
  });
});

describe("computeFourTierStats", () => {
  it("counts matches by tier and routing", async () => {
    const results = await matchAllFieldsFourTier(
      ["email", "customer_name", "unknown_xyz"],
      ["email", "name", "phone"]
    );

    const stats = computeFourTierStats(results);

    expect(stats.total).toBe(3);
    expect(stats.deterministic).toBeGreaterThanOrEqual(1);
    expect(stats.autoAccepted).toBeGreaterThanOrEqual(1);
  });
});

describe("formatFourTierStats", () => {
  it("formats stats as readable string", () => {
    const stats = {
      deterministic: 5,
      fuzzy: 3,
      semantic: 1,
      llm: 1,
      none: 0,
      total: 10,
      autoAccepted: 6,
      flaggedForReview: 3,
      humanReviewRequired: 1,
    };

    const formatted = formatFourTierStats(stats);

    expect(formatted).toContain("Total fields: 10");
    expect(formatted).toContain("Deterministic: 5");
    expect(formatted).toContain("50%");
    expect(formatted).toContain("Auto-accepted: 6");
  });
});
