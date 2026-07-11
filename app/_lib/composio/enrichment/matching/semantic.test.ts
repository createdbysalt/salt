import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cosineSimilarity,
  normalizeVector,
  matchFieldSemantic,
  matchFieldSemanticBatch,
  createCachedEmbeddingFn,
  buildFieldEmbeddingIndex,
  queryFieldIndex,
  clearEmbeddingCache,
} from "./semantic";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const vec = [1, 2, 3];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0);
  });

  it("returns -1 for opposite vectors", () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
  });

  it("handles different length vectors", () => {
    const a = [1, 2, 3];
    const b = [1, 2];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("handles empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe("normalizeVector", () => {
  it("normalizes to unit length", () => {
    const vec = [3, 4];
    const normalized = normalizeVector(vec);
    const length = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0));
    expect(length).toBeCloseTo(1);
  });

  it("handles zero vector", () => {
    const vec = [0, 0, 0];
    const normalized = normalizeVector(vec);
    expect(normalized).toEqual([0, 0, 0]);
  });
});

describe("matchFieldSemantic", () => {
  const mockEmbedFn = vi.fn(async (text: string) => {
    const embeddings: Record<string, number[]> = {
      customer_email: [0.9, 0.1, 0.0],
      email: [0.85, 0.15, 0.0],
      phone: [0.1, 0.9, 0.0],
      name: [0.0, 0.1, 0.9],
      contact_info: [0.7, 0.2, 0.1],
    };
    return embeddings[text] ?? [0.33, 0.33, 0.33];
  });

  beforeEach(() => {
    mockEmbedFn.mockClear();
    clearEmbeddingCache();
  });

  it("finds similar fields above threshold", async () => {
    const results = await matchFieldSemantic(
      "customer_email",
      ["email", "phone", "name"],
      mockEmbedFn,
      { similarityThreshold: 0.7 }
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].targetField).toBe("email");
    expect(results[0].similarity).toBeGreaterThan(0.7);
  });

  it("returns empty array when no matches above threshold", async () => {
    const results = await matchFieldSemantic(
      "customer_email",
      ["phone", "name"],
      mockEmbedFn,
      { similarityThreshold: 0.95 }
    );

    expect(results).toHaveLength(0);
  });

  it("respects maxResults limit", async () => {
    const results = await matchFieldSemantic(
      "contact_info",
      ["email", "phone", "name"],
      mockEmbedFn,
      { similarityThreshold: 0.1, maxResults: 2 }
    );

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("applies confidence discount", async () => {
    const results = await matchFieldSemantic(
      "customer_email",
      ["email"],
      mockEmbedFn,
      { similarityThreshold: 0.5, confidenceDiscount: 0.9 }
    );

    expect(results[0].confidence).toBeLessThan(results[0].similarity);
    expect(results[0].confidence).toBeCloseTo(results[0].similarity * 0.9);
  });
});

describe("matchFieldSemanticBatch", () => {
  const mockBatchEmbedFn = vi.fn(async (texts: string[]) => {
    return texts.map((text) => {
      const embeddings: Record<string, number[]> = {
        customer_email: [0.9, 0.1, 0.0],
        email: [0.85, 0.15, 0.0],
        phone: [0.1, 0.9, 0.0],
      };
      return embeddings[text] ?? [0.33, 0.33, 0.33];
    });
  });

  beforeEach(() => {
    mockBatchEmbedFn.mockClear();
  });

  it("matches fields in batch", async () => {
    const results = await matchFieldSemanticBatch(
      "customer_email",
      ["email", "phone"],
      mockBatchEmbedFn,
      { similarityThreshold: 0.7 }
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].targetField).toBe("email");
  });

  it("calls batch function once", async () => {
    await matchFieldSemanticBatch(
      "customer_email",
      ["email", "phone"],
      mockBatchEmbedFn
    );

    expect(mockBatchEmbedFn).toHaveBeenCalledTimes(1);
    expect(mockBatchEmbedFn).toHaveBeenCalledWith(["customer_email", "email", "phone"]);
  });
});

describe("createCachedEmbeddingFn", () => {
  it("caches embeddings", async () => {
    const mockFn = vi.fn(async () => [1, 2, 3]);
    const cachedFn = createCachedEmbeddingFn(mockFn);

    await cachedFn("test");
    await cachedFn("test");

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("returns cached value", async () => {
    clearEmbeddingCache();
    const mockFn = vi.fn(async () => [1, 2, 3]);
    const cachedFn = createCachedEmbeddingFn(mockFn);

    const result1 = await cachedFn("test");
    const result2 = await cachedFn("test");

    expect(result1).toEqual(result2);
  });
});

describe("buildFieldEmbeddingIndex and queryFieldIndex", () => {
  const mockBatchEmbedFn = vi.fn(async (texts: string[]) => {
    return texts.map((text) => {
      const embeddings: Record<string, number[]> = {
        email: [0.9, 0.1, 0.0],
        phone: [0.1, 0.9, 0.0],
        name: [0.0, 0.1, 0.9],
      };
      return embeddings[text] ?? [0.33, 0.33, 0.33];
    });
  });

  it("builds and queries index", async () => {
    const index = await buildFieldEmbeddingIndex(
      ["email", "phone", "name"],
      mockBatchEmbedFn
    );

    const queryEmbedding = [0.85, 0.15, 0.0];
    const results = queryFieldIndex(queryEmbedding, index, { similarityThreshold: 0.7 });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].targetField).toBe("email");
  });
});
