/**
 * Transcription Services Module
 *
 * Provides integrations for meeting transcription services.
 * Currently supports Fireflies.ai for automatic transcription
 * and AI-powered summary generation via OpenAI GPT-4.
 *
 * Usage:
 *   import { getTranscript, getMeetingDetails, isFirefliesConfigured } from '@/app/_lib/transcription'
 *   import { generateSummary, isSummaryConfigured } from '@/app/_lib/transcription'
 */

// Fireflies.ai client
export {
  getTranscript,
  getMeetingDetails,
  sentencesToPlainText,
  isFirefliesConfigured,
  FirefliesError,
} from "./fireflies-client";

// Fireflies types
export type {
  FirefliesTranscript,
  FirefliesMeetingDetails,
  FirefliesSentence,
  FirefliesSpeaker,
  FirefliesSummary,
  FirefliesAttendee,
  FirefliesAttendance,
  FirefliesErrorCode,
} from "./fireflies-client";

// AI summary generation
export { generateSummary, isSummaryConfigured, SummaryGenerationError } from "./ai-summary";
