/**
 * Recall.ai Calendar V2 API Types
 *
 * Type definitions for the Calendar integration API.
 * @see https://docs.recall.ai/docs/calendar-v2-integration-guide
 */

// =============================================================================
// CALENDAR TYPES
// =============================================================================

/** Calendar provider types (Recall API uses google_calendar/microsoft_outlook) */
export type CalendarProvider = "google_calendar" | "microsoft_outlook";

/** Calendar status */
export type CalendarStatus = "connected" | "disconnected" | "error";

/** Input for creating a calendar connection */
export interface CreateCalendarInput {
  /** OAuth provider (google_calendar or microsoft_outlook) */
  platform: CalendarProvider;
  /** OAuth refresh token from user authorization */
  oauth_refresh_token: string;
  /** OAuth client ID for token refresh */
  oauth_client_id: string;
  /** OAuth client secret for token refresh */
  oauth_client_secret: string;
  /** Webhook URL for calendar sync events */
  webhook_url?: string;
}

/** Calendar response from Recall API */
export interface RecallCalendar {
  id: string;
  platform: CalendarProvider;
  platform_email: string;
  status: CalendarStatus;
  status_message: string | null;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// CALENDAR EVENT TYPES
// =============================================================================

/** Calendar event attendee */
export interface CalendarEventAttendee {
  email: string;
  name: string | null;
  is_organizer: boolean;
  response_status: "accepted" | "declined" | "tentative" | "needs_action";
}

/** Calendar event from Recall API */
export interface RecallCalendarEvent {
  id: string;
  calendar_id: string;
  platform_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_url: string | null;
  meeting_platform: "zoom" | "google_meet" | "microsoft_teams" | "webex" | null;
  attendees: CalendarEventAttendee[];
  is_recurring: boolean;
  recurring_event_id: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  created_at: string;
  updated_at: string;
}

/** Paginated calendar events response */
export interface CalendarEventsResponse {
  results: RecallCalendarEvent[];
  next: string | null;
  previous: string | null;
}

// =============================================================================
// BOT SCHEDULING TYPES
// =============================================================================

/** Bot configuration for calendar event */
export interface CalendarBotConfig {
  /** Display name for the bot in the meeting */
  bot_name?: string;
  /** Recording settings */
  recording_mode?: "speaker_view" | "gallery_view" | "audio_only";
  /** Transcription settings */
  transcription_options?: {
    provider?: "recall" | "assembly_ai" | "deepgram";
  };
  /** Automatic leave settings */
  automatic_leave?: {
    waiting_room_timeout?: number;
    noone_joined_timeout?: number;
    everyone_left_timeout?: number;
  };
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/** Scheduled bot for calendar event */
export interface CalendarScheduledBot {
  id: string;
  calendar_event_id: string;
  bot_id: string;
  status: "scheduled" | "joining" | "in_call" | "done" | "error";
  created_at: string;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

/** Calendar sync webhook event (via Svix) */
export interface CalendarSyncWebhook {
  event: "calendar.sync_events";
  data: {
    calendar_id: string;
    last_updated_ts: string;
  };
}

/** Calendar update webhook (status changes like disconnected) */
export interface CalendarUpdateWebhook {
  event: "calendar.update";
  data: {
    calendar_id: string;
  };
}

/** All calendar webhook types */
export type RecallCalendarWebhook =
  | CalendarSyncWebhook
  | CalendarUpdateWebhook;

// =============================================================================
// CLIENT-MATCHING TYPES
// =============================================================================

/** Result of checking if an event should be recorded */
export interface ShouldRecordResult {
  /** Whether to record this event */
  record: boolean;
  /** Matched client ID if found */
  clientId?: string;
  /** Matched client name for logging */
  clientName?: string;
  /** Reason for decision */
  reason: string;
}
