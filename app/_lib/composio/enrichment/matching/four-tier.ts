import "server-only";

/**
 * Four-tier field matching cascade:
 * 1. Deterministic (exact match after normalization) - confidence 0.99
 * 2. Fuzzy (Jaro-Winkler + token overlap) - confidence 0.85-0.95
 * 3. Semantic (embedding similarity) - confidence 0.75-0.90
 * 4. LLM (constrained extraction) - confidence 0.60-0.85
 *
 * Structured data uses tiers 1-3 only.
 * Unstructured content (signatures, notes) can use tier 4.
 */

import { matchFieldToDeterministic, matchFieldToFuzzy } from "./engine";
import { matchFieldSemantic, type EmbeddingFn } from "./semantic";
import { extractFieldsWithLlm, type LlmExtractionResult } from "./llm-extractor";
import { assignConfidence, routeByConfidence, type RoutingDecision } from "./confidence-router";

export type MatchTier = "deterministic" | "fuzzy" | "semantic" | "llm" | "none";

export interface FourTierMatchResult {
  sourceField: string;
  targetField: string;
  value?: string;
  confidence: number;
  tier: MatchTier;
  rawScore: number;
  tiersAttempted: MatchTier[];
  routing: RoutingDecision;
  evidence?: string;
}

export interface FourTierMatchConfig {
  enableSemantic: boolean;
  enableLlm: boolean;
  deterministicThreshold: number;
  fuzzyThreshold: number;
  semanticThreshold: number;
  llmThreshold: number;
  shortCircuitOnHighConfidence: boolean;
}

const DEFAULT_CONFIG: FourTierMatchConfig = {
  enableSemantic: true,
  enableLlm: false,
  deterministicThreshold: 0.99,
  fuzzyThreshold: 0.85,
  semanticThreshold: 0.75,
  llmThreshold: 0.50,
  shortCircuitOnHighConfidence: true,
};

export interface FourTierMatchContext {
  embedFn?: EmbeddingFn;
  userId?: string;
  unstructuredText?: string;
}

export async function matchFieldFourTier(
  sourceField: string,
  targetFields: string[],
  ctx: FourTierMatchContext = {},
  config: Partial<FourTierMatchConfig> = {}
): Promise<FourTierMatchResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const tiersAttempted: MatchTier[] = [];

  const deterministicMatch = matchFieldToDeterministic(sourceField, targetFields);
  tiersAttempted.push("deterministic");

  if (deterministicMatch) {
    const confidence = assignConfidence("deterministic", deterministicMatch.confidence);
    return {
      sourceField,
      targetField: deterministicMatch.targetField,
      confidence,
      tier: "deterministic",
      rawScore: deterministicMatch.confidence,
      tiersAttempted,
      routing: routeByConfidence(deterministicMatch.targetField, confidence),
    };
  }

  const fuzzyMatches = matchFieldToFuzzy(sourceField, targetFields, {
    jaroWinklerThreshold: mergedConfig.fuzzyThreshold,
  });
  tiersAttempted.push("fuzzy");

  if (fuzzyMatches.length > 0) {
    const bestFuzzy = fuzzyMatches[0];
    if (bestFuzzy.confidence >= mergedConfig.fuzzyThreshold) {
      const confidence = assignConfidence("fuzzy", bestFuzzy.confidence);
      if (mergedConfig.shortCircuitOnHighConfidence && confidence >= 0.90) {
        return {
          sourceField,
          targetField: bestFuzzy.targetField,
          confidence,
          tier: "fuzzy",
          rawScore: bestFuzzy.confidence,
          tiersAttempted,
          routing: routeByConfidence(bestFuzzy.targetField, confidence),
        };
      }
      return {
        sourceField,
        targetField: bestFuzzy.targetField,
        confidence,
        tier: "fuzzy",
        rawScore: bestFuzzy.confidence,
        tiersAttempted,
        routing: routeByConfidence(bestFuzzy.targetField, confidence),
      };
    }
  }

  if (mergedConfig.enableSemantic && ctx.embedFn) {
    const semanticMatches = await matchFieldSemantic(
      sourceField,
      targetFields,
      ctx.embedFn,
      { similarityThreshold: mergedConfig.semanticThreshold }
    );
    tiersAttempted.push("semantic");

    if (semanticMatches.length > 0) {
      const bestSemantic = semanticMatches[0];
      const confidence = assignConfidence("semantic", bestSemantic.similarity);
      return {
        sourceField,
        targetField: bestSemantic.targetField,
        confidence,
        tier: "semantic",
        rawScore: bestSemantic.similarity,
        tiersAttempted,
        routing: routeByConfidence(bestSemantic.targetField, confidence),
      };
    }
  }

  if (mergedConfig.enableLlm && ctx.userId && ctx.unstructuredText) {
    const llmResults = await extractFieldsWithLlm(
      ctx.unstructuredText,
      { targetFields },
      ctx.userId
    );
    tiersAttempted.push("llm");

    const match = llmResults.find(
      (r) =>
        targetFields.includes(r.field) &&
        r.calibratedConfidence >= mergedConfig.llmThreshold
    );

    if (match) {
      return {
        sourceField,
        targetField: match.field,
        value: match.value,
        confidence: match.calibratedConfidence,
        tier: "llm",
        rawScore: match.rawConfidence,
        tiersAttempted,
        routing: routeByConfidence(match.field, match.calibratedConfidence),
        evidence: match.evidence,
      };
    }
  }

  return createNoMatch(sourceField, tiersAttempted);
}

function createNoMatch(sourceField: string, tiersAttempted: MatchTier[]): FourTierMatchResult {
  return {
    sourceField,
    targetField: "",
    confidence: 0,
    tier: "none",
    rawScore: 0,
    tiersAttempted,
    routing: "human_review",
  };
}

export async function matchAllFieldsFourTier(
  sourceFields: string[],
  targetFields: string[],
  ctx: FourTierMatchContext = {},
  config: Partial<FourTierMatchConfig> = {}
): Promise<Map<string, FourTierMatchResult>> {
  const results = new Map<string, FourTierMatchResult>();
  const usedTargets = new Set<string>();

  const sortedSources = [...sourceFields].sort((a, b) => {
    const aDet = matchFieldToDeterministic(a, targetFields) ? 1 : 0;
    const bDet = matchFieldToDeterministic(b, targetFields) ? 1 : 0;
    return bDet - aDet;
  });

  for (const source of sortedSources) {
    const availableTargets = targetFields.filter((t) => !usedTargets.has(t));

    if (availableTargets.length === 0) {
      results.set(source, createNoMatch(source, ["no-targets" as MatchTier]));
      continue;
    }

    const match = await matchFieldFourTier(source, availableTargets, ctx, config);
    results.set(source, match);
    if (match.tier !== "none") {
      usedTargets.add(match.targetField);
    }
  }

  return results;
}

export interface FourTierStats {
  deterministic: number;
  fuzzy: number;
  semantic: number;
  llm: number;
  none: number;
  total: number;
  autoAccepted: number;
  flaggedForReview: number;
  humanReviewRequired: number;
}

export function computeFourTierStats(results: Map<string, FourTierMatchResult>): FourTierStats {
  const stats: FourTierStats = {
    deterministic: 0,
    fuzzy: 0,
    semantic: 0,
    llm: 0,
    none: 0,
    total: results.size,
    autoAccepted: 0,
    flaggedForReview: 0,
    humanReviewRequired: 0,
  };

  for (const result of results.values()) {
    stats[result.tier]++;
    switch (result.routing) {
      case "auto_accept":
        stats.autoAccepted++;
        break;
      case "flag_review":
        stats.flaggedForReview++;
        break;
      case "human_review":
        stats.humanReviewRequired++;
        break;
    }
  }

  return stats;
}

export function formatFourTierStats(stats: FourTierStats): string {
  const pct = (n: number) => (stats.total > 0 ? `${Math.round((n / stats.total) * 100)}%` : "0%");

  return `Four-Tier Matching Stats:
Total fields: ${stats.total}
─ Tier breakdown:
  • Deterministic: ${stats.deterministic} (${pct(stats.deterministic)})
  • Fuzzy: ${stats.fuzzy} (${pct(stats.fuzzy)})
  • Semantic: ${stats.semantic} (${pct(stats.semantic)})
  • LLM: ${stats.llm} (${pct(stats.llm)})
  • Unmatched: ${stats.none} (${pct(stats.none)})
─ Routing decisions:
  • Auto-accepted: ${stats.autoAccepted} (${pct(stats.autoAccepted)})
  • Flagged for review: ${stats.flaggedForReview} (${pct(stats.flaggedForReview)})
  • Human review required: ${stats.humanReviewRequired} (${pct(stats.humanReviewRequired)})`;
}
