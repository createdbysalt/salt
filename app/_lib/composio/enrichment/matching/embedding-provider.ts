import "server-only";

import { generateEmbedding, generateEmbeddingBatch } from "@/app/_lib/ai/embeddings";
import {
  createCachedEmbeddingFn,
  buildFieldEmbeddingIndex,
  type EmbeddingFn,
  type BatchEmbeddingFn,
  type FieldEmbeddingIndex,
} from "./semantic";
import { getCanonicalFields, CANONICAL_SCHEMAS } from "../config";

/**
 * Production embedding provider using OpenAI text-embedding-3-small.
 * Includes caching and pre-computed field indices.
 */

const embeddingFn: EmbeddingFn = async (text: string): Promise<number[]> => {
  const result = await generateEmbedding(text);
  if (!result) {
    throw new Error("Failed to generate embedding");
  }
  return result;
};

const batchEmbeddingFn: BatchEmbeddingFn = async (
  texts: string[]
): Promise<number[][]> => {
  const results = await generateEmbeddingBatch(texts);
  return results.map((r) => {
    if (!r) throw new Error("Failed to generate embedding in batch");
    return r;
  });
};

let cachedEmbedFn: EmbeddingFn | null = null;

export function getEmbeddingFn(): EmbeddingFn {
  if (!cachedEmbedFn) {
    cachedEmbedFn = createCachedEmbeddingFn(embeddingFn);
  }
  return cachedEmbedFn;
}

export function getBatchEmbeddingFn(): BatchEmbeddingFn {
  return batchEmbeddingFn;
}

const fieldIndices: Map<string, FieldEmbeddingIndex> = new Map();

export async function getFieldIndex(
  entityType: keyof typeof CANONICAL_SCHEMAS
): Promise<FieldEmbeddingIndex> {
  const existing = fieldIndices.get(entityType);
  if (existing) return existing;

  const fields = getCanonicalFields(entityType);
  const index = await buildFieldEmbeddingIndex(fields, batchEmbeddingFn);
  fieldIndices.set(entityType, index);
  return index;
}

export async function preloadFieldIndices(): Promise<void> {
  const entityTypes = Object.keys(CANONICAL_SCHEMAS) as Array<
    keyof typeof CANONICAL_SCHEMAS
  >;

  for (const entityType of entityTypes) {
    await getFieldIndex(entityType);
  }
}

export function clearFieldIndices(): void {
  fieldIndices.clear();
}

export { embeddingFn, batchEmbeddingFn };
