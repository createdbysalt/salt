/**
 * Capture Confidence Scoring
 *
 * Determines confidence scores for routing captures to Memory surfaces.
 * Scores drive auto-routing vs Pending queue decisions.
 *
 * Design decisions (from 2026-06-12 founder interview):
 * - Each surface has its own confidence score
 * - High confidence (>85%) auto-routes
 * - Medium confidence (50-85%) auto-routes with "Salt inferred" flag
 * - Low confidence (<50%) goes to Pending queue
 * - Corrections feed back to adjust scoring
 */

import type {
  CaptureSourceType,
  CaptureEventType,
  MemorySurface,
  ExtractedData,
  EvidenceItem,
  RoutingStatus,
} from "../types";
import { CONFIDENCE_THRESHOLDS } from "../types";
import { sourceRoutesToSurface, getSourceMeta } from "../source-taxonomy";

// ============================================================================
// Scoring Weights
// ============================================================================

/**
 * Base weights for different evidence types.
 * Higher weight = more confident signal.
 */
const EVIDENCE_WEIGHTS: Record<EvidenceItem["type"], number> = {
  email_match: 40,       // Email matches a known entity
  name_match: 30,        // Name matches a known entity
  context_match: 25,     // Contextual signals (project name, org mention)
  recency: 15,           // Recent interaction with entity
  frequency: 20,         // Frequent interaction with entity
  llm_inference: 35,     // LLM-based entity extraction
};

/**
 * Bonus for source types that typically route to a surface.
 */
const SOURCE_SURFACE_AFFINITY_BONUS = 10;

/**
 * Penalty for routing to a surface the source rarely routes to.
 */
const SOURCE_SURFACE_MISMATCH_PENALTY = -15;

/**
 * Bonus when multiple evidence types agree.
 */
const CORROBORATION_BONUS = 10;

// ============================================================================
// Scoring Functions
// ============================================================================

export interface ConfidenceResult {
  score: number;
  status: RoutingStatus;
  evidence: EvidenceItem[];
  reason: string;
}

/**
 * Calculate confidence score for routing a capture to a specific surface.
 */
export function calculateSurfaceConfidence(
  sourceType: CaptureSourceType,
  captureType: CaptureEventType,
  targetSurface: MemorySurface,
  evidence: EvidenceItem[],
  existingEntityMatch: boolean = false
): ConfidenceResult {
  let score = 0;
  const reasons: string[] = [];

  // Base score from evidence
  for (const item of evidence) {
    const weight = EVIDENCE_WEIGHTS[item.type] ?? 10;
    score += weight * (item.weight / 100);
  }

  // Source-surface affinity
  if (sourceRoutesToSurface(sourceType, targetSurface)) {
    score += SOURCE_SURFACE_AFFINITY_BONUS;
    reasons.push(`${getSourceMeta(sourceType).label} typically routes to ${targetSurface}`);
  } else {
    score += SOURCE_SURFACE_MISMATCH_PENALTY;
    reasons.push(`${getSourceMeta(sourceType).label} rarely routes to ${targetSurface}`);
  }

  // Existing entity match bonus
  if (existingEntityMatch) {
    score += 20;
    reasons.push("Matches existing entity");
  }

  // Corroboration bonus: multiple evidence types agreeing
  const evidenceTypes = new Set(evidence.map((e) => e.type));
  if (evidenceTypes.size >= 2) {
    score += CORROBORATION_BONUS * (evidenceTypes.size - 1);
    reasons.push(`${evidenceTypes.size} evidence types corroborate`);
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine status based on thresholds
  let status: RoutingStatus;
  if (score >= CONFIDENCE_THRESHOLDS.AUTO_ROUTE) {
    status = "auto_routed";
  } else if (score >= CONFIDENCE_THRESHOLDS.INFERRED) {
    status = "auto_routed"; // Still auto-route, but with lower confidence
  } else {
    status = "pending";
  }

  return {
    score,
    status,
    evidence,
    reason: reasons.join("; "),
  };
}

/**
 * Calculate overall confidence for a capture (aggregate of all surface scores).
 */
export function calculateOverallConfidence(
  surfaceScores: Map<MemorySurface, number>
): number {
  if (surfaceScores.size === 0) return 0;

  // Overall = weighted average, with higher scores weighted more
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [, score] of surfaceScores) {
    const weight = score / 100; // Higher scores get more weight
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ============================================================================
// Evidence Extraction
// ============================================================================

/**
 * Extract evidence from message data for entity matching.
 */
export function extractMessageEvidence(
  data: ExtractedData,
  knownEmails: Set<string>,
  knownNames: Set<string>
): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];

  if (data.type !== "message" && data.type !== "thread") {
    return evidence;
  }

  // Check sender email
  if (data.sender?.email && knownEmails.has(data.sender.email.toLowerCase())) {
    evidence.push({
      type: "email_match",
      source: "sender",
      value: data.sender.email,
      weight: 100,
    });
  }

  // Check sender name
  if (data.sender?.name && knownNames.has(data.sender.name.toLowerCase())) {
    evidence.push({
      type: "name_match",
      source: "sender",
      value: data.sender.name,
      weight: 80,
    });
  }

  // Check recipients
  for (const recipient of data.recipients ?? []) {
    if (recipient.email && knownEmails.has(recipient.email.toLowerCase())) {
      evidence.push({
        type: "email_match",
        source: `recipient_${recipient.type}`,
        value: recipient.email,
        weight: recipient.type === "to" ? 90 : 60,
      });
    }
  }

  return evidence;
}

/**
 * Extract evidence from contact data.
 */
export function extractContactEvidence(
  data: ExtractedData,
  knownEmails: Set<string>,
  knownNames: Set<string>,
  knownOrgs: Set<string>
): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];

  if (data.type !== "contact") {
    return evidence;
  }

  // Email match
  if (data.email && knownEmails.has(data.email.toLowerCase())) {
    evidence.push({
      type: "email_match",
      source: "contact",
      value: data.email,
      weight: 100,
    });
  }

  // Name match
  if (data.name && knownNames.has(data.name.toLowerCase())) {
    evidence.push({
      type: "name_match",
      source: "contact",
      value: data.name,
      weight: 80,
    });
  }

  // Organization match
  if (data.organization && knownOrgs.has(data.organization.toLowerCase())) {
    evidence.push({
      type: "context_match",
      source: "organization",
      value: data.organization,
      weight: 70,
    });
  }

  return evidence;
}

/**
 * Extract evidence from payment data.
 */
export function extractPaymentEvidence(
  data: ExtractedData,
  knownEmails: Set<string>,
  knownNames: Set<string>
): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];

  if (data.type !== "payment") {
    return evidence;
  }

  // Customer email match
  if (data.customer_email && knownEmails.has(data.customer_email.toLowerCase())) {
    evidence.push({
      type: "email_match",
      source: "customer",
      value: data.customer_email,
      weight: 100,
    });
  }

  // Customer name match
  if (data.customer_name && knownNames.has(data.customer_name.toLowerCase())) {
    evidence.push({
      type: "name_match",
      source: "customer",
      value: data.customer_name,
      weight: 80,
    });
  }

  return evidence;
}

// ============================================================================
// Correction Learning
// ============================================================================

/**
 * Correction pattern that can be used to adjust future confidence.
 */
export interface CorrectionPattern {
  source_type: CaptureSourceType;
  capture_type: CaptureEventType;
  original_surface: MemorySurface;
  corrected_surface: MemorySurface;
  original_entity_id: string | null;
  corrected_entity_id: string;
  evidence_that_failed: EvidenceItem[];
  workspace_id: string;
  created_at: string;
}

/**
 * Apply correction patterns to adjust confidence scoring.
 *
 * For now, this is a placeholder. In production, this would:
 * 1. Load correction patterns for the workspace
 * 2. Identify similar captures (same source/type/evidence patterns)
 * 3. Apply learned adjustments to scoring
 */
export function applyCorrectionPatterns(
  baseScore: number,
  _sourceType: CaptureSourceType,
  _captureType: CaptureEventType,
  _targetSurface: MemorySurface,
  _patterns: CorrectionPattern[]
): number {
  // TODO: Implement pattern matching and score adjustment
  // For now, return base score unchanged
  return baseScore;
}

// ============================================================================
// High-Signal Detection (for Bootstrap)
// ============================================================================

export interface ContactSignalScore {
  email: string;
  name?: string;
  score: number;
  signals: {
    recency: number;      // Days since last contact
    frequency: number;    // Number of interactions
    revenue?: number;     // Revenue associated (if Stripe connected)
    threads?: number;     // Number of conversation threads
  };
}

/**
 * Score a contact for high-signal detection during bootstrap.
 *
 * Higher score = more important contact to surface first.
 */
export function scoreContactSignal(
  recencyDays: number,
  frequency: number,
  revenue: number = 0,
  threadCount: number = 0
): number {
  let score = 0;

  // Recency: more recent = higher score (exponential decay)
  const recencyScore = Math.max(0, 100 * Math.exp(-recencyDays / 30));
  score += recencyScore * 0.3;

  // Frequency: log scale to prevent outliers dominating
  const frequencyScore = Math.min(100, Math.log2(frequency + 1) * 20);
  score += frequencyScore * 0.3;

  // Revenue: if connected, strong signal
  if (revenue > 0) {
    const revenueScore = Math.min(100, Math.log10(revenue + 1) * 25);
    score += revenueScore * 0.25;
  }

  // Thread count: conversation depth
  const threadScore = Math.min(100, threadCount * 10);
  score += threadScore * 0.15;

  return Math.round(score);
}

/**
 * Filter contacts to top N by signal score.
 */
export function filterHighSignalContacts(
  contacts: ContactSignalScore[],
  limit: number
): ContactSignalScore[] {
  return contacts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
