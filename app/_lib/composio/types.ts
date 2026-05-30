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

export interface GmailSendEmailInput {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
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
export interface CalendarEventInput {
  summary: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  timeZone?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  location?: string;
  recurrence?: string[]; // RRULE strings
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
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

// ── Cal.com / Cal types (Phase 2) ──
export interface CalBookingInput {
  eventTypeId: number;
  startTime: string;
  endTime: string;
  attendee: {
    email: string;
    name: string;
    timeZone: string;
  };
  metadata?: Record<string, string>;
}

export interface CalBooking {
  id: number;
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'accepted' | 'pending' | 'cancelled' | 'rejected';
  attendee?: { email: string; name: string; timeZone: string };
  eventTypeId?: number;
  location?: string;
}

export interface CalEventType {
  id: number;
  slug: string;
  title: string;
  length: number; // minutes
  description?: string;
  hidden: boolean;
  requiresConfirmation: boolean;
  locations?: string[];
}

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