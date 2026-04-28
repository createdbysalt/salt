/**
 * Recall.ai API Types
 *
 * Type definitions for the Recall.ai meeting bot and transcription API.
 * @see https://docs.recall.ai/docs/getting-started
 */

// =============================================================================
// BOT TYPES
// =============================================================================

/** Bot status values */
export type BotStatus =
  | "ready"
  | "joining_call"
  | "in_waiting_room"
  | "in_call_not_recording"
  | "in_call_recording"
  | "call_ended"
  | "done"
  | "fatal"
  | "analysis_done";

/** Meeting platforms supported by Recall.ai */
export type MeetingPlatform =
  | "zoom"
  | "google_meet"
  | "microsoft_teams"
  | "webex"
  | "goto_meeting"
  | "chime";

/** Bot configuration for creating a new bot */
export interface CreateBotInput {
  /** The meeting URL the bot should join */
  meeting_url: string;
  /** Display name for the bot in the meeting */
  bot_name?: string;
  /** Join the meeting at this specific time (ISO 8601) */
  join_at?: string;
  /** Automatic leave settings */
  automatic_leave?: {
    /** Leave after this many seconds of waiting alone */
    waiting_room_timeout?: number;
    /** Leave after this many seconds in an empty call */
    noone_joined_timeout?: number;
    /** Leave after everyone else has left for this many seconds */
    everyone_left_timeout?: number;
  };
  /** Recording settings */
  recording_mode?: "speaker_view" | "gallery_view" | "audio_only";
  /** Enable real-time transcription */
  real_time_transcription?: {
    destination_url?: string;
    partial_results?: boolean;
  };
  /** Transcription settings */
  transcription_options?: {
    provider?: "recall" | "assembly_ai" | "deepgram" | "rev" | "aws";
  };
  /** Custom metadata to attach to this bot */
  metadata?: Record<string, string>;
}

/** Bot response from Recall.ai API */
export interface RecallBot {
  id: string;
  meeting_url: string;
  bot_name: string;
  status: BotStatus;
  status_changes: Array<{
    code: string;
    message: string | null;
    created_at: string;
  }>;
  meeting_metadata?: {
    title?: string;
    platform?: MeetingPlatform;
  };
  meeting_participants?: Array<{
    id: number;
    name: string;
    events: Array<{
      code: "join" | "leave";
      created_at: string;
    }>;
  }>;
  media?: {
    video_url?: string;
    audio_url?: string;
  };
  recording?: {
    id: string;
  };
  transcript?: {
    id: string;
  };
  metadata?: Record<string, string>;
  created_at: string;
  join_at?: string;
}

// =============================================================================
// TRANSCRIPT TYPES
// =============================================================================

/** Speaker information */
export interface RecallSpeaker {
  id: number;
  name: string;
}

/** Individual transcript word with timing */
export interface RecallWord {
  text: string;
  start_time: number;
  end_time: number;
  confidence?: number;
}

/** Transcript segment/utterance */
export interface RecallTranscriptSegment {
  speaker_id: number;
  speaker: string;
  words: RecallWord[];
  start_time: number;
  end_time: number;
}

/** Full transcript response */
export interface RecallTranscript {
  id: string;
  bot_id: string;
  segments: RecallTranscriptSegment[];
  speakers: RecallSpeaker[];
  created_at: string;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

/** Webhook event types */
export type WebhookEventType =
  | "bot.status_change"
  | "bot.transcription"
  | "bot.done"
  | "bot.media_ready";

/** Base webhook payload */
export interface RecallWebhookPayload {
  event: WebhookEventType;
  data: {
    bot_id: string;
    [key: string]: unknown;
  };
}

/** Bot status change webhook */
export interface BotStatusChangeWebhook extends RecallWebhookPayload {
  event: "bot.status_change";
  data: {
    bot_id: string;
    status: {
      code: BotStatus;
      message: string | null;
      created_at: string;
    };
  };
}

/** Bot done webhook (meeting ended, transcript ready) */
export interface BotDoneWebhook extends RecallWebhookPayload {
  event: "bot.done";
  data: {
    bot_id: string;
    transcript_id?: string;
    recording_id?: string;
  };
}

/** Bot media ready webhook */
export interface BotMediaReadyWebhook extends RecallWebhookPayload {
  event: "bot.media_ready";
  data: {
    bot_id: string;
    video_url?: string;
    audio_url?: string;
  };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/** Error codes for Recall.ai API errors */
export type RecallErrorCode =
  | "API_KEY_MISSING"
  | "AUTHENTICATION_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INVALID_MEETING_URL"
  | "BOT_ALREADY_IN_CALL"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/** Paginated list response */
export interface PaginatedResponse<T> {
  results: T[];
  next?: string;
  previous?: string;
  count: number;
}
