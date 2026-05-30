import { composioClient } from './client';
import type {
  GmailSendEmailInput, GmailMessage, GmailLabel,
  CalendarEventInput, CalendarEvent,
  CalBookingInput, CalBooking, CalEventType,
  FirefliesTranscriptInput, FirefliesTranscript, FirefliesMeeting,
} from './types';

// ── Generic executor ──
export async function executeComposioAction<T, R>(
  actionId: string,
  input: T,
  connectionId: string,
): Promise<R> {
  try {
    const result = await composioClient.execute({
      actionId,
      connectionId,
      parameters: input,
    });
    return result as R;
  } catch (error) {
    console.error(`Error executing action ${actionId}:`, error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════
// GMAIL (Phase 1 — pilot)
// ══════════════════════════════════════════════════════════════════════

export async function sendGmailEmail(
  input: GmailSendEmailInput,
  connectionId: string,
): Promise<GmailMessage> {
  return executeComposioAction<GmailSendEmailInput, GmailMessage>(
    'gmail.sendEmail', input, connectionId,
  );
}

export async function listGmailMessages(
  query: { query?: string; maxResults?: number },
  connectionId: string,
): Promise<GmailMessage[]> {
  return executeComposioAction<typeof query, GmailMessage[]>(
    'gmail.listMessages', query, connectionId,
  );
}

export async function getGmailMessage(
  messageId: string,
  connectionId: string,
): Promise<GmailMessage> {
  return executeComposioAction<{ id: string }, GmailMessage>(
    'gmail.getMessage', { id: messageId }, connectionId,
  );
}

export async function listGmailLabels(
  connectionId: string,
): Promise<GmailLabel[]> {
  return executeComposioAction<Record<string, never>, GmailLabel[]>(
    'gmail.listLabels', {}, connectionId,
  );
}

// ══════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR (Phase 2)
// ══════════════════════════════════════════════════════════════════════

export async function createCalendarEvent(
  input: CalendarEventInput,
  connectionId: string,
): Promise<CalendarEvent> {
  return executeComposioAction<CalendarEventInput, CalendarEvent>(
    'googlecalendar.createEvent', input, connectionId,
  );
}

export async function listCalendarEvents(
  params: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    orderBy?: 'startTime' | 'updated';
  },
  connectionId: string,
): Promise<CalendarEvent[]> {
  return executeComposioAction<typeof params, CalendarEvent[]>(
    'googlecalendar.listEvents', params, connectionId,
  );
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>,
  connectionId: string,
): Promise<CalendarEvent> {
  return executeComposioAction<{ eventId: string } & Partial<CalendarEventInput>, CalendarEvent>(
    'googlecalendar.updateEvent', { eventId, ...input }, connectionId,
  );
}

export async function deleteCalendarEvent(
  eventId: string,
  connectionId: string,
): Promise<void> {
  return executeComposioAction<{ eventId: string }, void>(
    'googlecalendar.deleteEvent', { eventId }, connectionId,
  );
}

// ══════════════════════════════════════════════════════════════════════
// CAL / CAL.COM (Phase 2)
// ══════════════════════════════════════════════════════════════════════

export async function createCalBooking(
  input: CalBookingInput,
  connectionId: string,
): Promise<CalBooking> {
  return executeComposioAction<CalBookingInput, CalBooking>(
    'cal.createBooking', input, connectionId,
  );
}

export async function listCalBookings(
  params: { userId?: string; status?: string; limit?: number },
  connectionId: string,
): Promise<CalBooking[]> {
  return executeComposioAction<typeof params, CalBooking[]>(
    'cal.listBookings', params, connectionId,
  );
}

export async function listCalEventTypes(
  connectionId: string,
): Promise<CalEventType[]> {
  return executeComposioAction<Record<string, never>, CalEventType[]>(
    'cal.listEventTypes', {}, connectionId,
  );
}

export async function cancelCalBooking(
  bookingId: number,
  reason?: string,
  connectionId?: string,
): Promise<void> {
  return executeComposioAction<{ id: number; reason?: string }, void>(
    'cal.cancelBooking', { id: bookingId, reason }, connectionId ?? '',
  );
}

// ══════════════════════════════════════════════════════════════════════
// FIREFLIES (Phase 2)
// ══════════════════════════════════════════════════════════════════════

export async function listFirefliesMeetings(
  input: FirefliesTranscriptInput,
  connectionId: string,
): Promise<FirefliesMeeting[]> {
  return executeComposioAction<FirefliesTranscriptInput, FirefliesMeeting[]>(
    'fireflies.listMeetings', input, connectionId,
  );
}

export async function getFirefliesTranscript(
  meetingId: string,
  connectionId: string,
): Promise<FirefliesTranscript> {
  return executeComposioAction<{ meetingId: string }, FirefliesTranscript>(
    'fireflies.getTranscript', { meetingId }, connectionId,
  );
}

export async function searchFirefliesMeetings(
  query: string,
  connectionId: string,
): Promise<FirefliesMeeting[]> {
  return executeComposioAction<{ query: string }, FirefliesMeeting[]>(
    'fireflies.searchMeetings', { query }, connectionId,
  );
}