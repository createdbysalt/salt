export type ComposioAction<T, R> = (input: T) => Promise<R>;

// ── Gmail types (Phase 1) ──
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: Array<{ name: string; value: string }>;
    body: { size: number; data?: string };
    parts?: GmailMessagePart[];
  };
  sizeEstimate: number;
  raw?: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: Array<{ name: string; value: string }>;
  body: { size: number; data?: string };
  parts?: GmailMessagePart[];
}

/** Matches the live GMAIL_SEND_EMAIL input schema (verified 2026-06-11). */
export interface GmailSendEmailInput {
  recipient_email: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  extra_recipients?: string[];
  is_html?: boolean;
}

/** Matches the live GMAIL_CREATE_EMAIL_DRAFT input schema. */
export interface GmailCreateDraftInput extends GmailSendEmailInput {
  thread_id?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility: string;
  labelListVisibility: string;
  type: string;
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
  color?: { textColor: string; backgroundColor: string };
}

// ── Google Calendar types (Phase 2) ──
/** Matches the live GOOGLECALENDAR_CREATE_EVENT input schema (verified 2026-06-11). */
export interface CalendarEventInput {
  start_datetime: string; // ISO 8601
  summary?: string;
  description?: string;
  attendees?: string[]; // attendee email addresses
  event_duration_hour?: number;
  event_duration_minutes?: number;
  timezone?: string;
  calendar_id?: string;
  location?: string;
  recurrence?: string[]; // RRULE strings
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  location?: string;
  recurrence?: string[];
  htmlLink?: string;
  status?: string;
}

// ── Cal.com types retired ──
// Cal.com processing handled by cal-booking-processor.ts with inline ParsedBooking type.
// Backfills use executeComposioAction directly without typed wrappers.

// ── Fireflies types (Phase 2) ──
export interface FirefliesTranscriptInput {
  meetingId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: Array<{ name: string; email: string }>;
  summary?: string;
  transcriptUrl?: string;
  meetingLink?: string;
}

export interface FirefliesMeeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: Array<{ name: string; email: string }>;
  summary?: string;
  transcript?: FirefliesTranscript;
  recording?: string;
}