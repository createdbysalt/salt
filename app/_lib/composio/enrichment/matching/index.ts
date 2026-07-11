/**
 * Field matching engine for config-driven enrichment.
 * Four-tier matching: deterministic → fuzzy → semantic → LLM
 *
 * Usage:
 *   import { matchField, routeByConfidence, normalizeFieldName } from './matching'
 */

export {
  normalizeFieldName,
  normalizeFieldNameAggressive,
  tokenizeFieldName,
  getFieldTokenOverlap,
  extractFieldParts,
} from "./normalize";

export { jaroSimilarity, jaroWinkler, jaroWinklerSorted } from "./jaro-winkler";

export {
  matchField,
  matchFieldToDeterministic,
  matchFieldToFuzzy,
  matchAllFields,
  computeAggregateConfidence,
  type MatchMethod,
  type MatchResult,
  type ConfidenceSignal,
  type MatcherConfig,
} from "./engine";

export {
  routeByConfidence,
  routeFieldExtraction,
  routeAllFields,
  assignConfidence,
  getFieldRiskLevel,
  shouldAutoAccept,
  shouldFlagForReview,
  shouldRequireHumanReview,
  type FieldRiskLevel,
  type RoutingDecision,
  type RoutingResult,
} from "./confidence-router";

export {
  cosineSimilarity,
  normalizeVector,
  matchFieldSemantic,
  matchFieldSemanticBatch,
  createCachedEmbeddingFn,
  buildFieldEmbeddingIndex,
  queryFieldIndex,
  getCachedEmbedding,
  setCachedEmbedding,
  clearEmbeddingCache,
  getEmbeddingCacheSize,
  type EmbeddingFn,
  type BatchEmbeddingFn,
  type SemanticMatchResult,
  type SemanticMatcherConfig,
  type FieldEmbeddingIndex,
} from "./semantic";

export {
  matchFieldMultiTier,
  matchAllFieldsMultiTier,
  computeTierStats,
  formatTierStats,
  type MultiTierMatchConfig,
  type MultiTierMatchResult,
  type TierStats,
} from "./multi-tier";

export {
  getEmbeddingFn,
  getBatchEmbeddingFn,
  getFieldIndex,
  preloadFieldIndices,
  clearFieldIndices,
} from "./embedding-provider";

export {
  extractFieldsWithLlm,
  extractSignatureFields,
  extractFromUnstructured,
  type LlmExtractionResult,
  type LlmExtractionConfig,
  type UnstructuredExtractionContext,
} from "./llm-extractor";

export {
  matchFieldFourTier,
  matchAllFieldsFourTier,
  computeFourTierStats,
  formatFourTierStats,
  type MatchTier,
  type FourTierMatchResult,
  type FourTierMatchConfig,
  type FourTierMatchContext,
  type FourTierStats,
} from "./four-tier";
