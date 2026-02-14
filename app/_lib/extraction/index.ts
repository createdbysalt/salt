/**
 * Extraction Module
 *
 * AI-powered extraction of proposal-relevant insights from various sources.
 *
 * Usage:
 *   import { extractFromIntake, IntakeExtractionSchema } from '@/app/_lib/extraction'
 */

// Extractors
export { extractFromIntake } from "./intake-extractor";

// Schemas
export {
  IntakeExtractionSchema,
  TranscriptExtractionSchema,
  ExtractedProblemSchema,
  ExtractedGoalSchema,
  ExtractedObjectionSchema,
  ExtractedDecisionMakerSchema,
  ExtractedTimelineSchema,
  ExtractedBudgetSchema,
  ExtractedQuoteSchema,
  ExtractedAntiGoalSchema,
  ExtractedCompetitorInfoSchema,
  ConfidenceSchema,
  SourceReferenceSchema,
  scoreToConfidence,
  calculateAverageConfidence,
  countByConfidence,
  type IntakeExtraction,
  type TranscriptExtraction,
} from "./schemas";
