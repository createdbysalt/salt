import { normalizeFieldName, normalizeFieldNameAggressive, getFieldTokenOverlap } from "./normalize";
import { jaroWinkler, jaroWinklerSorted } from "./jaro-winkler";

/**
 * Four-tier field matching engine.
 * Tiers: deterministic (0.99) → fuzzy (0.85-0.95) → semantic (0.75-0.90) → LLM (0.60-0.85)
 *
 * This module implements tiers 1-2 (deterministic and fuzzy).
 * Semantic matching requires embeddings and is implemented separately.
 */

export type MatchMethod = "deterministic" | "fuzzy" | "semantic" | "llm";

export interface ConfidenceSignal {
  type:
    | "exact_match"
    | "normalized_match"
    | "aggressive_match"
    | "jaro_winkler"
    | "token_overlap"
    | "embedding_similarity"
    | "llm_extraction";
  score: number;
  weight: number;
}

export interface MatchResult {
  sourceField: string;
  targetField: string;
  confidence: number;
  method: MatchMethod;
  signals: ConfidenceSignal[];
}

export interface MatcherConfig {
  jaroWinklerThreshold?: number;
  tokenOverlapThreshold?: number;
  enableAggressiveNormalization?: boolean;
}

const DEFAULT_CONFIG: Required<MatcherConfig> = {
  jaroWinklerThreshold: 0.85,
  tokenOverlapThreshold: 0.6,
  enableAggressiveNormalization: true,
};

export function matchFieldToDeterministic(
  sourceField: string,
  targetFields: string[]
): MatchResult | null {
  const normalizedSource = normalizeFieldName(sourceField);

  for (const target of targetFields) {
    if (sourceField === target) {
      return {
        sourceField,
        targetField: target,
        confidence: 0.99,
        method: "deterministic",
        signals: [{ type: "exact_match", score: 1.0, weight: 1.0 }],
      };
    }
  }

  for (const target of targetFields) {
    if (normalizedSource === normalizeFieldName(target)) {
      return {
        sourceField,
        targetField: target,
        confidence: 0.99,
        method: "deterministic",
        signals: [{ type: "normalized_match", score: 1.0, weight: 1.0 }],
      };
    }
  }

  return null;
}

export function matchFieldToFuzzy(
  sourceField: string,
  targetFields: string[],
  config: MatcherConfig = {}
): MatchResult[] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const results: MatchResult[] = [];

  const normalizedSource = normalizeFieldName(sourceField);

  if (mergedConfig.enableAggressiveNormalization) {
    const aggressiveSource = normalizeFieldNameAggressive(sourceField);
    for (const target of targetFields) {
      if (aggressiveSource === normalizeFieldNameAggressive(target)) {
        results.push({
          sourceField,
          targetField: target,
          confidence: 0.95,
          method: "fuzzy",
          signals: [{ type: "aggressive_match", score: 1.0, weight: 1.0 }],
        });
      }
    }
  }

  const jaroMatches = jaroWinklerSorted(
    normalizedSource,
    targetFields.map(normalizeFieldName),
    mergedConfig.jaroWinklerThreshold
  );

  for (const match of jaroMatches) {
    const originalTarget = targetFields.find(
      (t) => normalizeFieldName(t) === match.target
    );
    if (!originalTarget) continue;

    const alreadyMatched = results.some((r) => r.targetField === originalTarget);
    if (alreadyMatched) continue;

    results.push({
      sourceField,
      targetField: originalTarget,
      confidence: match.score * 0.95,
      method: "fuzzy",
      signals: [{ type: "jaro_winkler", score: match.score, weight: 1.0 }],
    });
  }

  for (const target of targetFields) {
    const alreadyMatched = results.some((r) => r.targetField === target);
    if (alreadyMatched) continue;

    const tokenOverlap = getFieldTokenOverlap(sourceField, target);
    if (tokenOverlap >= mergedConfig.tokenOverlapThreshold) {
      results.push({
        sourceField,
        targetField: target,
        confidence: tokenOverlap * 0.90,
        method: "fuzzy",
        signals: [{ type: "token_overlap", score: tokenOverlap, weight: 1.0 }],
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

export function matchField(
  sourceField: string,
  targetFields: string[],
  config: MatcherConfig = {}
): MatchResult | null {
  const deterministicMatch = matchFieldToDeterministic(sourceField, targetFields);
  if (deterministicMatch) {
    return deterministicMatch;
  }

  const fuzzyMatches = matchFieldToFuzzy(sourceField, targetFields, config);
  if (fuzzyMatches.length > 0) {
    return fuzzyMatches[0];
  }

  return null;
}

export function matchAllFields(
  sourceFields: string[],
  targetFields: string[],
  config: MatcherConfig = {}
): Map<string, MatchResult> {
  const results = new Map<string, MatchResult>();
  const usedTargets = new Set<string>();

  const sortedSources = [...sourceFields].sort((a, b) => {
    const aDet = matchFieldToDeterministic(a, targetFields);
    const bDet = matchFieldToDeterministic(b, targetFields);
    if (aDet && !bDet) return -1;
    if (!aDet && bDet) return 1;
    return 0;
  });

  for (const source of sortedSources) {
    const availableTargets = targetFields.filter((t) => !usedTargets.has(t));
    if (availableTargets.length === 0) break;

    const match = matchField(source, availableTargets, config);
    if (match) {
      results.set(source, match);
      usedTargets.add(match.targetField);
    }
  }

  return results;
}

export function computeAggregateConfidence(signals: ConfidenceSignal[]): number {
  if (signals.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    weightedSum += signal.score * signal.weight;
    totalWeight += signal.weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
