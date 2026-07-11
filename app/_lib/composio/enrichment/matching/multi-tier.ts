/**
 * Multi-tier field matching that cascades through:
 * 1. Deterministic (exact match after normalization) - confidence 0.99
 * 2. Fuzzy (Jaro-Winkler + token overlap) - confidence 0.85-0.95
 * 3. Semantic (embedding similarity) - confidence 0.75-0.90
 *
 * Short-circuits on high-confidence match for performance.
 */

import { matchFieldToDeterministic, matchFieldToFuzzy, type MatchResult } from "./engine";
import { matchFieldSemantic, type EmbeddingFn, type SemanticMatchResult } from "./semantic";
import { assignConfidence } from "./confidence-router";

export interface MultiTierMatchConfig {
  enableSemantic: boolean;
  deterministicThreshold: number;
  fuzzyThreshold: number;
  semanticThreshold: number;
  shortCircuitOnDeterministic: boolean;
  shortCircuitOnFuzzy: boolean;
}

const DEFAULT_CONFIG: MultiTierMatchConfig = {
  enableSemantic: true,
  deterministicThreshold: 0.99,
  fuzzyThreshold: 0.85,
  semanticThreshold: 0.75,
  shortCircuitOnDeterministic: true,
  shortCircuitOnFuzzy: true,
};

export interface MultiTierMatchResult {
  sourceField: string;
  targetField: string;
  confidence: number;
  tier: "deterministic" | "fuzzy" | "semantic" | "none";
  rawScore: number;
  tiersAttempted: string[];
}

export async function matchFieldMultiTier(
  sourceField: string,
  targetFields: string[],
  embedFn?: EmbeddingFn,
  config: Partial<MultiTierMatchConfig> = {}
): Promise<MultiTierMatchResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const tiersAttempted: string[] = [];

  const deterministicMatch = matchFieldToDeterministic(sourceField, targetFields);
  tiersAttempted.push("deterministic");

  if (deterministicMatch) {
    return {
      sourceField,
      targetField: deterministicMatch.targetField,
      confidence: assignConfidence("deterministic", deterministicMatch.confidence),
      tier: "deterministic",
      rawScore: deterministicMatch.confidence,
      tiersAttempted,
    };
  }

  if (mergedConfig.shortCircuitOnDeterministic && deterministicMatch) {
    return createNoMatch(sourceField, tiersAttempted);
  }

  const fuzzyMatches = matchFieldToFuzzy(sourceField, targetFields, {
    jaroWinklerThreshold: mergedConfig.fuzzyThreshold,
  });
  tiersAttempted.push("fuzzy");

  if (fuzzyMatches.length > 0) {
    const bestFuzzy = fuzzyMatches[0];
    if (bestFuzzy.confidence >= mergedConfig.fuzzyThreshold) {
      return {
        sourceField,
        targetField: bestFuzzy.targetField,
        confidence: assignConfidence("fuzzy", bestFuzzy.confidence),
        tier: "fuzzy",
        rawScore: bestFuzzy.confidence,
        tiersAttempted,
      };
    }
  }

  if (mergedConfig.shortCircuitOnFuzzy && fuzzyMatches.length > 0) {
    return createNoMatch(sourceField, tiersAttempted);
  }

  if (mergedConfig.enableSemantic && embedFn) {
    const semanticMatches = await matchFieldSemantic(
      sourceField,
      targetFields,
      embedFn,
      { similarityThreshold: mergedConfig.semanticThreshold }
    );
    tiersAttempted.push("semantic");

    if (semanticMatches.length > 0) {
      const bestSemantic = semanticMatches[0];
      return {
        sourceField,
        targetField: bestSemantic.targetField,
        confidence: assignConfidence("semantic", bestSemantic.similarity),
        tier: "semantic",
        rawScore: bestSemantic.similarity,
        tiersAttempted,
      };
    }
  }

  return createNoMatch(sourceField, tiersAttempted);
}

function createNoMatch(sourceField: string, tiersAttempted: string[]): MultiTierMatchResult {
  return {
    sourceField,
    targetField: "",
    confidence: 0,
    tier: "none",
    rawScore: 0,
    tiersAttempted,
  };
}

export async function matchAllFieldsMultiTier(
  sourceFields: string[],
  targetFields: string[],
  embedFn?: EmbeddingFn,
  config: Partial<MultiTierMatchConfig> = {}
): Promise<Map<string, MultiTierMatchResult>> {
  const results = new Map<string, MultiTierMatchResult>();
  const usedTargets = new Set<string>();

  const sortedSources = [...sourceFields].sort((a, b) => {
    const aDet = matchFieldToDeterministic(a, targetFields) ? 1 : 0;
    const bDet = matchFieldToDeterministic(b, targetFields) ? 1 : 0;
    return bDet - aDet;
  });

  for (const source of sortedSources) {
    const availableTargets = targetFields.filter((t) => !usedTargets.has(t));

    if (availableTargets.length === 0) {
      results.set(source, createNoMatch(source, ["no-targets"]));
      continue;
    }

    const match = await matchFieldMultiTier(source, availableTargets, embedFn, config);
    results.set(source, match);
    if (match.tier !== "none") {
      usedTargets.add(match.targetField);
    }
  }

  return results;
}

export interface TierStats {
  deterministic: number;
  fuzzy: number;
  semantic: number;
  none: number;
  total: number;
}

export function computeTierStats(results: Map<string, MultiTierMatchResult>): TierStats {
  const stats: TierStats = {
    deterministic: 0,
    fuzzy: 0,
    semantic: 0,
    none: 0,
    total: results.size,
  };

  for (const result of results.values()) {
    stats[result.tier]++;
  }

  return stats;
}

export function formatTierStats(stats: TierStats): string {
  const lines = [
    `Total fields: ${stats.total}`,
    `- Deterministic: ${stats.deterministic} (${percentage(stats.deterministic, stats.total)})`,
    `- Fuzzy: ${stats.fuzzy} (${percentage(stats.fuzzy, stats.total)})`,
    `- Semantic: ${stats.semantic} (${percentage(stats.semantic, stats.total)})`,
    `- Unmatched: ${stats.none} (${percentage(stats.none, stats.total)})`,
  ];
  return lines.join("\n");
}

function percentage(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}
