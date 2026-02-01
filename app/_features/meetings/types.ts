/**
 * Meetings Feature - Type Definitions
 *
 * Types for meeting transcription, AI summaries, and action items.
 * Integrates with Fireflies.ai for transcription and OpenAI for summaries.
 * Aligns with client_meetings table transcript columns.
 */

// =============================================================================
// TRANSCRIPT STATUS (matches client_meetings.transcript_status)
// =============================================================================

/** Transcript processing status */
export type TranscriptStatus =
  | "none" // No transcription requested
  | "recording" // Meeting is being recorded
  | "processing" // Transcription in progress
  | "completed" // Transcription completed
  | "failed"; // Transcription failed

// =============================================================================
// MEETING TRANSCRIPT
// =============================================================================

/** Speaker segment within a transcript */
export interface TranscriptSpeaker {
  name: string;
  email?: string;
}

/** A single segment of the transcript with speaker and timing */
export interface TranscriptSegment {
  speaker: TranscriptSpeaker;
  text: string;
  startTime: number; // Seconds from meeting start
  endTime: number;
}

/**
 * Full meeting transcript structure.
 * Contains both raw text and structured segments.
 */
export interface MeetingTranscript {
  /** Meeting ID in our system (client_meetings.id) */
  meetingId: string;

  /** Fireflies meeting ID for API reference */
  firefliesMeetingId: string;

  /** Full transcript as plain text */
  rawText: string;

  /** Structured transcript with speaker segments */
  segments: TranscriptSegment[];

  /** Duration in seconds */
  durationSeconds: number;

  /** When the transcript was created */
  createdAt: Date;
}

// =============================================================================
// ACTION ITEMS
// =============================================================================

/** Priority levels for action items */
export type ActionItemPriority = "low" | "medium" | "high";

/**
 * Action item extracted from a meeting.
 * Stored in client_meetings.transcript_action_items JSON column.
 */
export interface ActionItem {
  /** Unique identifier for the action item */
  id: string;

  /** Description of the action to be taken */
  text: string;

  /** Person assigned to the action (extracted from transcript) */
  assignee?: string;

  /** Due date if mentioned in the meeting */
  dueDate?: string; // ISO date string

  /** Whether the action has been completed */
  completed: boolean;

  /** Priority level (inferred by AI) */
  priority?: ActionItemPriority;

  /** Context from the meeting where this was discussed */
  context?: string;
}

// =============================================================================
// MEETING SUMMARY
// =============================================================================

/** Key decision made during the meeting */
export interface KeyDecision {
  /** What was decided */
  decision: string;

  /** Context or rationale for the decision */
  rationale?: string;

  /** Who was involved in making the decision */
  participants?: string[];
}

/** Next step identified in the meeting */
export interface NextStep {
  /** Description of the next step */
  description: string;

  /** Who is responsible */
  owner?: string;

  /** Target date if specified */
  targetDate?: string;
}

/**
 * AI-generated meeting summary structure.
 * Created by processing transcript through GPT-4.
 */
export interface MeetingSummary {
  /** Meeting ID this summary is for */
  meetingId: string;

  /** Executive summary (2-3 sentences) */
  executiveSummary: string;

  /** Key points discussed */
  keyPoints: string[];

  /** Key decisions made */
  keyDecisions: KeyDecision[];

  /** Action items extracted */
  actionItems: ActionItem[];

  /** Next steps identified */
  nextSteps: NextStep[];

  /** Participants identified in the meeting */
  participants: string[];

  /** Topics/themes discussed */
  topics: string[];

  /** AI model used for generation */
  model: string;

  /** When the summary was generated */
  generatedAt: Date;
}

// =============================================================================
// INPUT/OUTPUT TYPES FOR ACTIONS
// =============================================================================

/** Input for generating an AI summary from a transcript */
export interface GenerateSummaryInput {
  meetingId: string;
  transcriptContent: string;
  meetingTitle?: string;
  meetingType?: string;
}

/** Result of summary generation */
export interface GenerateSummaryResult {
  summary: MeetingSummary;
  wordCount: number;
}

/** Input for fetching a transcript from Fireflies */
export interface FetchTranscriptInput {
  firefliesMeetingId: string;
}

/** Input for updating meeting transcript data */
export interface UpdateTranscriptInput {
  meetingId: string;
  transcriptContent: string;
  transcriptSummary?: string;
  actionItems?: ActionItem[];
  status: TranscriptStatus;
}

// =============================================================================
// FIREFLIES WEBHOOK TYPES
// =============================================================================

/** Fireflies webhook event types */
export type FirefliesWebhookEventType =
  | "Transcription completed"
  | "Meeting started"
  | "Meeting ended";

/** Fireflies webhook payload structure */
export interface FirefliesWebhookPayload {
  event: FirefliesWebhookEventType;
  meetingId: string;
  title?: string;
  duration?: number;
  participants?: string[];
  date?: string;
  organizerEmail?: string;
}

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

/** Props for TranscriptViewer component */
export interface TranscriptViewerProps {
  transcript: MeetingTranscript;
  summary?: MeetingSummary | null;
  actionItems?: ActionItem[];
  className?: string;
}

/** Props for action item list component */
export interface ActionItemsListProps {
  actionItems: ActionItem[];
  onToggleComplete?: (id: string) => void;
  className?: string;
}

/** Props for meeting summary display */
export interface MeetingSummaryDisplayProps {
  summary: MeetingSummary;
  className?: string;
}
