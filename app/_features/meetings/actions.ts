/**
 * Meetings Feature - Server Actions
 *
 * This module will contain server actions for meeting transcription and summaries.
 * Actions for fetching transcripts, generating AI summaries, and updating meetings.
 *
 * Usage:
 *   import { generateMeetingSummary, updateMeetingTranscript } from '@/app/_features/meetings/actions'
 */

"use server";

// Types exported for use in other modules
export type {
  TranscriptStatus,
  MeetingTranscript,
  TranscriptSegment,
  TranscriptSpeaker,
  ActionItem,
  ActionItemPriority,
  MeetingSummary,
  KeyDecision,
  NextStep,
  GenerateSummaryInput,
  GenerateSummaryResult,
  FetchTranscriptInput,
  UpdateTranscriptInput,
  FirefliesWebhookPayload,
  FirefliesWebhookEventType,
} from "./types";

// Action implementations will be added in future stories
