/**
 * Semantic matching layer using embeddings.
 * Provides cosine similarity matching for field names that don't match
 * deterministically or via fuzzy matching.
 *
 * This layer is designed to work with any embedding provider.
 */

export type EmbeddingFn = (text: string) => Promise<number[]>;
export type BatchEmbeddingFn = (texts: string[]) => Promise<number[][]>;

export interface SemanticMatchResult {
  sourceField: string;
  targetField: string;
  similarity: number;
  confidence: number;
}

export interface SemanticMatcherConfig {
  similarityThreshold: number;
  confidenceDiscount: number;
  maxResults: number;
}

const DEFAULT_CONFIG: SemanticMatcherConfig = {
  similarityThreshold: 0.75,
  confidenceDiscount: 0.90,
  maxResults: 3,
};

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export function normalizeVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vec : vec.map((v) => v / norm);
}

export async function matchFieldSemantic(
  sourceField: string,
  targetFields: string[],
  embedFn: EmbeddingFn,
  config: Partial<SemanticMatcherConfig> = {}
): Promise<SemanticMatchResult[]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const results: SemanticMatchResult[] = [];

  const sourceEmbedding = normalizeVector(await embedFn(sourceField));

  for (const target of targetFields) {
    const targetEmbedding = normalizeVector(await embedFn(target));
    const similarity = cosineSimilarity(sourceEmbedding, targetEmbedding);

    if (similarity >= mergedConfig.similarityThreshold) {
      results.push({
        sourceField,
        targetField: target,
        similarity,
        confidence: similarity * mergedConfig.confidenceDiscount,
      });
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, mergedConfig.maxResults);
}

export async function matchFieldSemanticBatch(
  sourceField: string,
  targetFields: string[],
  batchEmbedFn: BatchEmbeddingFn,
  config: Partial<SemanticMatcherConfig> = {}
): Promise<SemanticMatchResult[]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const results: SemanticMatchResult[] = [];

  const allTexts = [sourceField, ...targetFields];
  const embeddings = await batchEmbedFn(allTexts);

  const sourceEmbedding = normalizeVector(embeddings[0]);
  const targetEmbeddings = embeddings.slice(1).map(normalizeVector);

  for (let i = 0; i < targetFields.length; i++) {
    const similarity = cosineSimilarity(sourceEmbedding, targetEmbeddings[i]);

    if (similarity >= mergedConfig.similarityThreshold) {
      results.push({
        sourceField,
        targetField: targetFields[i],
        similarity,
        confidence: similarity * mergedConfig.confidenceDiscount,
      });
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, mergedConfig.maxResults);
}

const embeddingCache = new Map<string, number[]>();

export function getCachedEmbedding(text: string): number[] | undefined {
  return embeddingCache.get(text);
}

export function setCachedEmbedding(text: string, embedding: number[]): void {
  embeddingCache.set(text, embedding);
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

export function getEmbeddingCacheSize(): number {
  return embeddingCache.size;
}

export function createCachedEmbeddingFn(embedFn: EmbeddingFn): EmbeddingFn {
  return async (text: string): Promise<number[]> => {
    const cached = getCachedEmbedding(text);
    if (cached) return cached;

    const embedding = await embedFn(text);
    setCachedEmbedding(text, embedding);
    return embedding;
  };
}

export interface FieldEmbeddingIndex {
  fields: string[];
  embeddings: number[][];
}

export async function buildFieldEmbeddingIndex(
  fields: string[],
  batchEmbedFn: BatchEmbeddingFn
): Promise<FieldEmbeddingIndex> {
  const embeddings = await batchEmbedFn(fields);
  return {
    fields,
    embeddings: embeddings.map(normalizeVector),
  };
}

export function queryFieldIndex(
  sourceEmbedding: number[],
  index: FieldEmbeddingIndex,
  config: Partial<SemanticMatcherConfig> = {}
): SemanticMatchResult[] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const normalizedSource = normalizeVector(sourceEmbedding);
  const results: SemanticMatchResult[] = [];

  for (let i = 0; i < index.fields.length; i++) {
    const similarity = cosineSimilarity(normalizedSource, index.embeddings[i]);

    if (similarity >= mergedConfig.similarityThreshold) {
      results.push({
        sourceField: "",
        targetField: index.fields[i],
        similarity,
        confidence: similarity * mergedConfig.confidenceDiscount,
      });
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, mergedConfig.maxResults);
}
