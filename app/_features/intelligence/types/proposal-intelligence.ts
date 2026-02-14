/**
 * Proposal Intelligence Types
 *
 * Types for AI-powered proposal insight extraction from intake responses,
 * meeting transcripts, and client context.
 *
 * Design principles:
 * - Every extraction includes confidence scoring
 * - Every item is traceable to its source
 * - Structured for both machine and human consumption
 *
 * Usage:
 *   import type { ProposalExtractionResult, ExtractedProblem } from '@/app/_features/intelligence/types/proposal-intelligence'
 */

import type { DataSource, AIConfidence } from "./ambient-intelligence";

// ============================================================================
// Confidence & Source Types
// ============================================================================

/**
 * Extraction confidence levels with clear thresholds
 * Based on research: 3-tier system proven effective for UX
 */
export type ExtractionConfidence = "high" | "medium" | "low";

/**
 * Confidence thresholds for extraction decisions
 * - HIGH (>85%): Auto-accepted with edit option
 * - MEDIUM (50-85%): Review prompt, visual indicator
 * - LOW (<50%): Flagged explicitly, source highlighted
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.5,
} as const;

/**
 * Source types for extracted content
 */
export type ExtractionSource =
  | "intake" // From intake form responses
  | "transcript" // From meeting transcript
  | "discovery" // From auto-discovery data
  | "knowledge" // From knowledge base items
  | "history"; // From client history

/**
 * Reference to the exact source of extracted content
 */
export interface SourceReference {
  /** Type of source */
  type: ExtractionSource;
  /** Specific identifier (question key, timestamp, item id) */
  ref: string;
  /** Human-readable label */
  label: string;
  /** Direct quote from source, if applicable */
  quote?: string;
  /** Link to view the source */
  href?: string;
}

// ============================================================================
// Extracted Item Types
// ============================================================================

/**
 * Base structure for all extracted items
 */
export interface ExtractedItemBase {
  /** The extracted text/insight */
  text: string;
  /** Confidence level of this extraction */
  confidence: ExtractionConfidence;
  /** Numeric confidence score (0-1) */
  confidenceScore: number;
  /** Where this was extracted from */
  source: SourceReference;
  /** Exact quote from the source (for verification) */
  quote?: string;
}

/**
 * Extracted problem statement
 * From: trigger_response, obstacles_response, transcripts
 */
export interface ExtractedProblem extends ExtractedItemBase {
  /** Category of problem */
  category: "pain_point" | "challenge" | "frustration" | "limitation" | "risk";
  /** Business impact if known */
  businessImpact?: string;
  /** Related to competitor? */
  competitorMentioned?: string;
}

/**
 * Extracted goal or desired outcome
 * From: desired_future_response, transcripts
 */
export interface ExtractedGoal extends ExtractedItemBase {
  /** Type of goal */
  type: "outcome" | "metric" | "feeling" | "capability" | "transformation";
  /** Timeframe mentioned */
  timeframe?: string;
  /** Success criteria if stated */
  successCriteria?: string;
}

/**
 * Extracted objection or concern
 * From: obstacles_response, anti_goal_response, transcripts
 */
export interface ExtractedObjection extends ExtractedItemBase {
  /** Type of objection */
  type: "past_failure" | "budget" | "timing" | "trust" | "risk" | "internal" | "other";
  /** How to potentially address it */
  suggestedResponse?: string;
}

/**
 * Extracted decision maker or stakeholder
 * From: decision_process_response, transcripts
 */
export interface ExtractedDecisionMaker extends ExtractedItemBase {
  /** Role/title if mentioned */
  role?: string;
  /** Their apparent influence level */
  influence: "decision_maker" | "influencer" | "user" | "unknown";
  /** Key concerns they mentioned */
  concerns?: string[];
}

/**
 * Extracted timeline signal
 * From: transcripts, intake additional notes
 */
export interface ExtractedTimeline {
  /** Original text mentioning timeline */
  text: string;
  /** Parsed deadline/target date if extractable */
  targetDate?: string;
  /** Urgency level */
  urgency: "asap" | "specific_date" | "quarter" | "flexible" | "unknown";
  /** Confidence */
  confidence: ExtractionConfidence;
  confidenceScore: number;
  /** Source */
  source: SourceReference;
}

/**
 * Extracted budget signal
 * From: budget_range, transcripts
 */
export interface ExtractedBudget {
  /** Original text mentioning budget */
  text: string;
  /** Parsed range if extractable */
  range?: {
    min?: number;
    max?: number;
    currency: string;
  };
  /** Budget stance */
  stance: "stated" | "implied" | "flexible" | "constrained" | "unknown";
  /** Confidence */
  confidence: ExtractionConfidence;
  confidenceScore: number;
  /** Source */
  source: SourceReference;
}

/**
 * Extracted quote for proposal use
 * From: transcripts, intake responses
 */
export interface ExtractedQuote {
  /** The exact quote */
  text: string;
  /** Who said it */
  speaker: string;
  /** Timestamp for transcript quotes */
  timestamp?: string;
  /** Context of the quote */
  context: string;
  /** Category for organization */
  category: "problem" | "goal" | "objection" | "quotable" | "decision";
  /** Confidence */
  confidence: ExtractionConfidence;
  confidenceScore: number;
  /** Source */
  source: SourceReference;
}

/**
 * Extracted competitive intelligence
 * From: discovery, transcripts
 */
export interface ExtractedCompetitorInfo {
  /** Competitor name/product */
  competitor: string;
  /** What was said about them */
  context: string;
  /** Sentiment */
  sentiment: "positive" | "negative" | "neutral";
  /** Opportunity this creates */
  opportunity?: string;
  /** Source */
  source: SourceReference;
}

/**
 * Extracted anti-goal (what to avoid)
 * From: anti_goal_response
 */
export interface ExtractedAntiGoal extends ExtractedItemBase {
  /** Severity of this anti-goal */
  severity: "dealbreaker" | "important" | "preference";
  /** Related past experience */
  pastExperience?: string;
}

// ============================================================================
// Complete Extraction Result
// ============================================================================

/**
 * Complete result from extracting proposal insights
 */
export interface ProposalExtractionResult {
  /** Problems and pain points */
  problems: ExtractedProblem[];
  /** Goals and desired outcomes */
  goals: ExtractedGoal[];
  /** Timeline signals */
  timeline: ExtractedTimeline | null;
  /** Budget signals */
  budget: ExtractedBudget | null;
  /** Decision makers and stakeholders */
  decisionMakers: ExtractedDecisionMaker[];
  /** Objections and concerns */
  objections: ExtractedObjection[];
  /** Things to avoid */
  antiGoals: ExtractedAntiGoal[];
  /** Competitive intelligence */
  competitiveIntel: ExtractedCompetitorInfo[];
  /** Quotable statements for proposal */
  quotes: ExtractedQuote[];
  /** Data provenance */
  dataSource: DataSource;
  /** Overall extraction metadata */
  metadata: ExtractionMetadata;
}

/**
 * Metadata about the extraction process
 */
export interface ExtractionMetadata {
  /** When extraction was performed */
  extractedAt: Date;
  /** Sources processed */
  sourcesProcessed: ExtractionSource[];
  /** Total items extracted */
  totalItems: number;
  /** High confidence items count */
  highConfidenceCount: number;
  /** Medium confidence items count */
  mediumConfidenceCount: number;
  /** Low confidence items count */
  lowConfidenceCount: number;
  /** Average confidence score */
  averageConfidence: number;
  /** Model used for extraction */
  model: string;
  /** Processing time in ms */
  processingTimeMs: number;
}

// ============================================================================
// Extraction Input Types
// ============================================================================

/**
 * Input for intake-based extraction
 */
export interface IntakeExtractionInput {
  intakeId: string;
  clientId: string;
  /** Which essential questions to extract from */
  questions?: Array<
    | "trigger"
    | "desired_future"
    | "obstacles"
    | "decision_process"
    | "anti_goal"
  >;
  /** Include discovery data */
  includeDiscovery?: boolean;
}

/**
 * Input for transcript-based extraction
 */
export interface TranscriptExtractionInput {
  transcriptId: string;
  clientId: string;
  /** Focus areas for extraction */
  focusAreas?: Array<
    | "problems"
    | "goals"
    | "timeline"
    | "budget"
    | "objections"
    | "quotes"
  >;
}

/**
 * Input for client context extraction
 */
export interface ClientContextExtractionInput {
  clientId: string;
  /** Include past project analysis */
  includeProjectHistory?: boolean;
  /** Include payment patterns */
  includePaymentHistory?: boolean;
  /** Include health score context */
  includeHealthScore?: boolean;
}

// ============================================================================
// Extraction Status Types
// ============================================================================

/**
 * Status of an extraction job
 */
export type ExtractionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "partial";

/**
 * Extraction job tracking
 */
export interface ExtractionJob {
  id: string;
  clientId: string;
  status: ExtractionStatus;
  sources: ExtractionSource[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: ProposalExtractionResult;
}

// ============================================================================
// Display Types
// ============================================================================

/**
 * Extracted item formatted for UI display
 */
export interface DisplayableExtraction {
  id: string;
  type:
    | "problem"
    | "goal"
    | "objection"
    | "decision_maker"
    | "timeline"
    | "budget"
    | "quote"
    | "competitor"
    | "anti_goal";
  text: string;
  confidence: ExtractionConfidence;
  confidenceBadge: {
    label: string;
    color: "green" | "yellow" | "red";
    description: string;
  };
  source: {
    label: string;
    href?: string;
    quote?: string;
  };
  metadata?: Record<string, string>;
  actions: Array<{
    label: string;
    action: "copy" | "edit" | "dismiss" | "expand";
  }>;
}

/**
 * Map confidence to display badge
 */
export function getConfidenceBadge(
  confidence: ExtractionConfidence,
  score: number
): DisplayableExtraction["confidenceBadge"] {
  switch (confidence) {
    case "high":
      return {
        label: "High Confidence",
        color: "green",
        description: `${Math.round(score * 100)}% confident - Auto-accepted`,
      };
    case "medium":
      return {
        label: "Review",
        color: "yellow",
        description: `${Math.round(score * 100)}% confident - Please verify`,
      };
    case "low":
      return {
        label: "Low Confidence",
        color: "red",
        description: `${Math.round(score * 100)}% confident - Manual review needed`,
      };
  }
}

/**
 * Convert extraction result to displayable items
 */
export function toDisplayableExtractions(
  result: ProposalExtractionResult
): DisplayableExtraction[] {
  const items: DisplayableExtraction[] = [];
  let idCounter = 0;

  const makeId = () => `extraction-${++idCounter}`;

  // Problems
  for (const p of result.problems) {
    items.push({
      id: makeId(),
      type: "problem",
      text: p.text,
      confidence: p.confidence,
      confidenceBadge: getConfidenceBadge(p.confidence, p.confidenceScore),
      source: {
        label: p.source.label,
        href: p.source.href,
        quote: p.quote,
      },
      metadata: p.businessImpact ? { impact: p.businessImpact } : undefined,
      actions: [
        { label: "Copy to Proposal", action: "copy" },
        { label: "Edit", action: "edit" },
      ],
    });
  }

  // Goals
  for (const g of result.goals) {
    items.push({
      id: makeId(),
      type: "goal",
      text: g.text,
      confidence: g.confidence,
      confidenceBadge: getConfidenceBadge(g.confidence, g.confidenceScore),
      source: {
        label: g.source.label,
        href: g.source.href,
        quote: g.quote,
      },
      metadata: g.timeframe ? { timeframe: g.timeframe } : undefined,
      actions: [
        { label: "Copy to Proposal", action: "copy" },
        { label: "Edit", action: "edit" },
      ],
    });
  }

  // Quotes
  for (const q of result.quotes) {
    items.push({
      id: makeId(),
      type: "quote",
      text: `"${q.text}"`,
      confidence: q.confidence,
      confidenceBadge: getConfidenceBadge(q.confidence, q.confidenceScore),
      source: {
        label: `${q.speaker}${q.timestamp ? ` @ ${q.timestamp}` : ""}`,
        href: q.source.href,
      },
      metadata: { category: q.category, context: q.context },
      actions: [
        { label: "Copy to Proposal", action: "copy" },
        { label: "Edit", action: "edit" },
      ],
    });
  }

  // Objections
  for (const o of result.objections) {
    items.push({
      id: makeId(),
      type: "objection",
      text: o.text,
      confidence: o.confidence,
      confidenceBadge: getConfidenceBadge(o.confidence, o.confidenceScore),
      source: {
        label: o.source.label,
        href: o.source.href,
        quote: o.quote,
      },
      metadata: o.suggestedResponse
        ? { suggestion: o.suggestedResponse }
        : undefined,
      actions: [
        { label: "View Response Suggestion", action: "expand" },
        { label: "Dismiss", action: "dismiss" },
      ],
    });
  }

  return items;
}
