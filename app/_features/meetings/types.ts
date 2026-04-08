/**
 * Meetings Feature - Type Definitions
 *
 * Types for:
 * - Meeting types (studio-configurable meeting templates)
 * - Meeting transcription, AI summaries, and action items
 * - Fireflies.ai integration for transcription
 * - OpenAI for summaries
 */

// =============================================================================
// MEETING TYPES (configurable meeting templates)
// =============================================================================

/** Booking question types that sync with Cal.com */
export type BookingQuestionType = "text" | "textarea" | "select" | "multiselect" | "url" | "phone" | "email"

/** A booking question for a meeting type */
export interface BookingQuestion {
  id: string
  type: BookingQuestionType
  label: string
  required: boolean
  placeholder?: string
  options?: string[] // For select/multiselect types
}

/** Meeting location options */
export type MeetingLocation = "cal_video" | "google_meet" | "zoom" | "phone" | "in_person" | "link"

/** Currency codes for meeting pricing */
export type MeetingCurrency = "usd" | "eur" | "gbp" | "cad" | "aud"

/** A studio-configurable meeting type (discovery, kickoff, etc.) */
export interface MeetingType {
  id: string
  studio_id: string
  name: string
  slug: string
  duration_minutes: number
  description: string | null
  sort_order: number
  is_active: boolean
  cal_event_type_id: string | null
  cal_synced_at: string | null
  // Booking configuration
  booking_questions: BookingQuestion[]
  buffer_minutes: number
  min_notice_hours: number
  location: MeetingLocation
  location_phone: string | null // Phone number for phone call location
  location_address: string | null // Address for in-person location
  location_link: string | null // URL for link meeting location
  requires_confirmation: boolean
  // Pricing (null = free)
  price_cents: number | null
  currency: MeetingCurrency
  // Timestamps
  created_at: string
  updated_at: string
}

/** Input for creating a meeting type */
export interface CreateMeetingTypeInput {
  name: string
  duration_minutes: number
  description?: string
  booking_questions?: BookingQuestion[]
  buffer_minutes?: number
  min_notice_hours?: number
  location?: MeetingLocation
  location_phone?: string | null
  location_address?: string | null
  location_link?: string | null
  price_cents?: number | null
  currency?: MeetingCurrency
}

/** Input for updating a meeting type */
export interface UpdateMeetingTypeInput {
  id: string
  name?: string
  duration_minutes?: number
  description?: string
  is_active?: boolean
  sort_order?: number
  booking_questions?: BookingQuestion[]
  buffer_minutes?: number
  min_notice_hours?: number
  location?: MeetingLocation
  location_phone?: string | null
  location_address?: string | null
  location_link?: string | null
  requires_confirmation?: boolean
  price_cents?: number | null
  currency?: MeetingCurrency
}

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
