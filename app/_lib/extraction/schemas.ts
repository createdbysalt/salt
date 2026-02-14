/**
 * Extraction Schemas
 *
 * Zod schemas for OpenAI Structured Outputs.
 * Using zodResponseFormat achieves 100% schema conformance.
 *
 * Usage:
 *   import { IntakeExtractionSchema, zodResponseFormat } from '@/app/_lib/extraction/schemas'
 */

import { z } from "zod";

// ============================================================================
// Confidence Schema
// ============================================================================

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

export const ConfidenceScoreSchema = z.number().min(0).max(1);

// ============================================================================
// Source Reference Schema
// ============================================================================

export const SourceReferenceSchema = z.object({
  type: z.enum(["intake", "transcript", "discovery", "knowledge", "history"]),
  ref: z.string().describe("Specific identifier (question key, timestamp, item id)"),
  label: z.string().describe("Human-readable source label"),
  quote: z.string().optional().describe("Direct quote from source"),
});

// ============================================================================
// Extracted Problem Schema
// ============================================================================

export const ExtractedProblemSchema = z.object({
  text: z.string().describe("The extracted problem statement"),
  category: z.enum([
    "pain_point",
    "challenge",
    "frustration",
    "limitation",
    "risk",
  ]).describe("Category of the problem"),
  confidence: ConfidenceSchema,
  confidenceScore: ConfidenceScoreSchema,
  source: SourceReferenceSchema,
  quote: z.string().optional().describe("Exact quote from source"),
  businessImpact: z.string().optional().describe("Business impact if mentioned"),
  competitorMentioned: z.string().optional().describe("Competitor mentioned in context"),
});

// ============================================================================
// Extracted Goal Schema
// ============================================================================

export const ExtractedGoalSchema = z.object({
  text: z.string().describe("The extracted goal or desired outcome"),
  type: z.enum([
    "outcome",
    "metric",
    "feeling",
    "capability",
    "transformation",
  ]).describe("Type of goal"),
  confidence: ConfidenceSchema,
  confidenceScore: ConfidenceScoreSchema,
  source: SourceReferenceSchema,
  quote: z.string().optional().describe("Exact quote from source"),
  timeframe: z.string().optional().describe("Timeframe mentioned"),
  successCriteria: z.string().optional().describe("Success criteria if stated"),
});

// ============================================================================
// Extracted Objection Schema
// ============================================================================

export const ExtractedObjectionSchema = z.object({
  text: z.string().describe("The extracted objection or concern"),
  type: z.enum([
    "past_failure",
    "budget",
    "timing",
    "trust",
    "risk",
    "internal",
    "other",
  ]).describe("Type of objection"),
  confidence: ConfidenceSchema,
  confidenceScore: ConfidenceScoreSchema,
  source: SourceReferenceSchema,
  quote: z.string().optional().describe("Exact quote from source"),
  suggestedResponse: z.string().optional().describe("How to address this objection"),
});

// ============================================================================
// Extracted Decision Maker Schema
// ============================================================================

export const ExtractedDecisionMakerSchema = z.object({
  text: z.string().describe("Description of the stakeholder"),
  role: z.string().optional().describe("Role or title if mentioned"),
  influence: z.enum([
    "decision_maker",
    "influencer",
    "user",
    "unknown",
  ]).describe("Influence level"),
  confidence: ConfidenceSchema,
  confidenceScore: ConfidenceScoreSchema,
  source: SourceReferenceSchema,
  concerns: z.array(z.string()).optional().describe("Key concerns they mentioned"),
});

// ============================================================================
// Extracted Timeline Schema
// ============================================================================

export const ExtractedTimelineSchema = z.object({
  text: z.string().describe("Original text mentioning timeline"),
  targetDate: z.string().optional().describe("Parsed deadline/target date"),
  urgency: z.enum([
    "asap",
    "specific_date",
    "quarter",
    "flexible",
    "unknown",
  ]).describe("Urgency level"),
  confidence: ConfidenceSchema,
  confidenceScore: ConfidenceScoreSchema,
  source: SourceReferenceSchema,
});

// ============================================================================
// Extracted Budget Schema
// ============================================================================

export const ExtractedBudgetSchema = z.object({
  text: z.string().describe("Original text mentioning budget"),
  range: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default("USD"),
  }).optional().describe("Parsed budget range"),
  stance: z.enum([
    "stated",
    "implied",
    "flexible",
    "constrained",
    "unknown",
  ]).describe("Budget stance"),
  confidence: ConfidenceSchema,
  confidenceScore: ConfidenceScoreSchema,
  source: SourceReferenceSchema,
});

// ============================================================================
// Extracted Quote Schema
// ============================================================================

export const ExtractedQuoteSchema = z.object({
  text: z.string().describe("The exact quote"),
  speaker: z.string().describe("Who said it"),
  timestamp: z.string().optional().describe("Timestamp for transcript quotes"),
  context: z.string().describe("Context of the quote"),
  category: z.enum([
    "problem",
    "goal",
    "objection",
    "quotable",
    "decision",
  ]).describe("Quote category"),
  confidence: ConfidenceSchema,
  confidenceScore: ConfidenceScoreSchema,
  source: SourceReferenceSchema,
});

// ============================================================================
// Extracted Anti-Goal Schema
// ============================================================================

export const ExtractedAntiGoalSchema = z.object({
  text: z.string().describe("What to avoid"),
  severity: z.enum([
    "dealbreaker",
    "important",
    "preference",
  ]).describe("Severity of this anti-goal"),
  confidence: ConfidenceSchema,
  confidenceScore: ConfidenceScoreSchema,
  source: SourceReferenceSchema,
  quote: z.string().optional().describe("Exact quote from source"),
  pastExperience: z.string().optional().describe("Related past experience"),
});

// ============================================================================
// Extracted Competitor Info Schema
// ============================================================================

export const ExtractedCompetitorInfoSchema = z.object({
  competitor: z.string().describe("Competitor name/product"),
  context: z.string().describe("What was said about them"),
  sentiment: z.enum(["positive", "negative", "neutral"]),
  opportunity: z.string().optional().describe("Opportunity this creates"),
  source: SourceReferenceSchema,
});

// ============================================================================
// Complete Intake Extraction Schema
// ============================================================================

/**
 * Schema for extracting insights from intake responses
 * Used with OpenAI Structured Outputs for 100% conformance
 */
export const IntakeExtractionSchema = z.object({
  problems: z.array(ExtractedProblemSchema).describe(
    "Problems and pain points extracted from intake responses"
  ),
  goals: z.array(ExtractedGoalSchema).describe(
    "Goals and desired outcomes extracted from intake responses"
  ),
  objections: z.array(ExtractedObjectionSchema).describe(
    "Objections, concerns, and past failures from intake responses"
  ),
  decisionMakers: z.array(ExtractedDecisionMakerSchema).describe(
    "Decision makers and stakeholders mentioned"
  ),
  antiGoals: z.array(ExtractedAntiGoalSchema).describe(
    "Things to avoid, dealbreakers from anti_goal response"
  ),
  quotes: z.array(ExtractedQuoteSchema).describe(
    "Quotable statements suitable for proposals"
  ),
  timeline: ExtractedTimelineSchema.nullable().describe(
    "Timeline signals if mentioned"
  ),
  budget: ExtractedBudgetSchema.nullable().describe(
    "Budget signals if mentioned"
  ),
});

export type IntakeExtraction = z.infer<typeof IntakeExtractionSchema>;

// ============================================================================
// Transcript Extraction Schema
// ============================================================================

/**
 * Schema for extracting insights from meeting transcripts
 */
export const TranscriptExtractionSchema = z.object({
  problems: z.array(ExtractedProblemSchema),
  goals: z.array(ExtractedGoalSchema),
  objections: z.array(ExtractedObjectionSchema),
  decisionMakers: z.array(ExtractedDecisionMakerSchema),
  quotes: z.array(ExtractedQuoteSchema),
  timeline: ExtractedTimelineSchema.nullable(),
  budget: ExtractedBudgetSchema.nullable(),
  competitiveIntel: z.array(ExtractedCompetitorInfoSchema),
});

export type TranscriptExtraction = z.infer<typeof TranscriptExtractionSchema>;

// ============================================================================
// Confidence Scoring Utilities
// ============================================================================

/**
 * Calculate confidence level from score
 */
export function scoreToConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 0.85) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

/**
 * Calculate average confidence from an extraction result
 */
export function calculateAverageConfidence(items: Array<{ confidenceScore: number }>): number {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, item) => acc + item.confidenceScore, 0);
  return sum / items.length;
}

/**
 * Count items by confidence level
 */
export function countByConfidence(items: Array<{ confidence: "high" | "medium" | "low" }>) {
  return {
    high: items.filter((i) => i.confidence === "high").length,
    medium: items.filter((i) => i.confidence === "medium").length,
    low: items.filter((i) => i.confidence === "low").length,
  };
}

// ============================================================================
// OpenAI Response Format Helper
// ============================================================================

/**
 * Create OpenAI response_format for structured outputs
 * Use with the OpenAI API's response_format parameter
 */
export function createStructuredOutputFormat(
  schema: z.ZodType,
  name: string
): {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
} {
  // Convert Zod schema to JSON Schema
  // Note: In production, use zod-to-json-schema library
  // For now, we'll use a simplified approach
  return {
    type: "json_schema",
    json_schema: {
      name,
      strict: true,
      schema: zodToJsonSchema(schema),
    },
  };
}

/**
 * Simplified Zod to JSON Schema converter
 * In production, use: npm install zod-to-json-schema
 */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // This is a placeholder - in production use the actual library
  // The OpenAI SDK has built-in support for this via zodResponseFormat
  return {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  };
}
