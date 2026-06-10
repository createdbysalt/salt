import "server-only";

import type { ToolExecuteResponse } from "@composio/core";
import { getComposioClient } from "./client";
import { assertComposioToolAllowed, parseComposioToolInput } from "./tool-policy";
import { requireMatchingComposioUserId } from "./require-composio-user";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import type {
  GmailSendEmailInput, GmailMessage, GmailLabel,
  CalendarEventInput, CalendarEvent,
  CalBookingInput, CalBooking, CalEventType,
  FirefliesTranscriptInput, FirefliesTranscript, FirefliesMeeting,
} from "./types";

function unwrapToolResult<R>(result: ToolExecuteResponse): R {
  if (result && typeof result === "object" && "data" in result) {
    return result.data as R;
  }
  return result as R;
}

// ── Generic executor ──
export async function executeComposioAction<T, R>(
  toolSlug: string,
  input: T,
  connectionId: string,
  userId: string,
  options?: { skipAuthCheck?: boolean; humanApproved?: boolean },
): Promise<R> {
  if (!options?.skipAuthCheck) {
    await requireMatchingComposioUserId(userId);
  }

  const policy = assertComposioToolAllowed(toolSlug);
  if (policy.requiresHumanConfirmation && !options?.humanApproved) {
    throw new Error(
      `Composio tool ${toolSlug} requires explicit human approval before execution`,
    );
  }

  const validatedInput = parseComposioToolInput(toolSlug, input);

  try {
    const result = await getComposioClient().tools.execute(toolSlug, {
      userId,
      connectedAccountId: connectionId,
      arguments: validatedInput,
    });
    return unwrapToolResult<R>(result);
  } catch (error) {
    console.error("Error executing Composio tool:", toolSlug, error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════
// GMAIL (Phase 1 — pilot)
// ══════════════════════════════════════════════════════════════════════

export async function sendGmailEmail(
  input: GmailSendEmailInput,
  connectionId: string,
  userId: string,
): Promise<GmailMessage> {
  return executeComposioAction<GmailSendEmailInput, GmailMessage>(
    COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
    input,
    connectionId,
    userId,
    { humanApproved: true },
  );
}

export async function listGmailMessages(
  query: { query?: string; maxResults?: number },
  connectionId: string,
  userId: string,
): Promise<GmailMessage[]> {
  return executeComposioAction<typeof query, GmailMessage[]>(
    COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
    query,
    connectionId,
    userId,
  );
}

export async function getGmailMessage(
  messageId: string,
  connectionId: string,
  userId: string,
): Promise<GmailMessage> {
  return executeComposioAction<{ id: string }, GmailMessage>(
    COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE,
    { id: messageId },
    connectionId,
    userId,
  );
}

export async function listGmailLabels(
  connectionId: string,
  userId: string,
): Promise<GmailLabel[]> {
  return executeComposioAction<Record<string, never>, GmailLabel[]>(
    COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS,
    {},
    connectionId,
    userId,
  );
}

// ══════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR (Phase 2)
// ══════════════════════════════════════════════════════════════════════

export async function createCalendarEvent(
  input: CalendarEventInput,
  connectionId: string,
  userId: string,
): Promise<CalendarEvent> {
  return executeComposioAction<CalendarEventInput, CalendarEvent>(
    COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT,
    input,
    connectionId,
    userId,
    { humanApproved: true },
  );
}

export async function listCalendarEvents(
  params: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    orderBy?: "startTime" | "updated";
  },
  connectionId: string,
  userId: string,
): Promise<CalendarEvent[]> {
  return executeComposioAction<typeof params, CalendarEvent[]>(
    COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS,
    params,
    connectionId,
    userId,
  );
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>,
  connectionId: string,
  userId: string,
): Promise<CalendarEvent> {
  return executeComposioAction<{ eventId: string } & Partial<CalendarEventInput>, CalendarEvent>(
    COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT,
    { eventId, ...input },
    connectionId,
    userId,
    { humanApproved: true },
  );
}

export async function deleteCalendarEvent(
  eventId: string,
  connectionId: string,
  userId: string,
): Promise<void> {
  return executeComposioAction<{ eventId: string }, void>(
    COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT,
    { eventId },
    connectionId,
    userId,
    { humanApproved: true },
  );
}

// ══════════════════════════════════════════════════════════════════════
// CAL / CAL.COM (Phase 2)
// ══════════════════════════════════════════════════════════════════════

export async function createCalBooking(
  input: CalBookingInput,
  connectionId: string,
  userId: string,
): Promise<CalBooking> {
  return executeComposioAction<CalBookingInput, CalBooking>(
    COMPOSIO_TOOL_SLUGS.CAL_CREATE_BOOKING,
    input,
    connectionId,
    userId,
    { humanApproved: true },
  );
}

export async function listCalBookings(
  params: { userId?: string; status?: string; limit?: number },
  connectionId: string,
  composioUserId: string,
): Promise<CalBooking[]> {
  return executeComposioAction<typeof params, CalBooking[]>(
    COMPOSIO_TOOL_SLUGS.CAL_LIST_BOOKINGS,
    params,
    connectionId,
    composioUserId,
  );
}

export async function listCalEventTypes(
  connectionId: string,
  userId: string,
): Promise<CalEventType[]> {
  return executeComposioAction<Record<string, never>, CalEventType[]>(
    COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES,
    {},
    connectionId,
    userId,
  );
}

export async function cancelCalBooking(
  bookingId: number,
  reason: string | undefined,
  connectionId: string,
  userId: string,
): Promise<void> {
  return executeComposioAction<{ id: number; reason?: string }, void>(
    COMPOSIO_TOOL_SLUGS.CAL_CANCEL_BOOKING,
    { id: bookingId, reason },
    connectionId,
    userId,
    { humanApproved: true },
  );
}

// ══════════════════════════════════════════════════════════════════════
// FIREFLIES (Phase 2)
// ══════════════════════════════════════════════════════════════════════

export async function listFirefliesMeetings(
  input: FirefliesTranscriptInput,
  connectionId: string,
  userId: string,
): Promise<FirefliesMeeting[]> {
  return executeComposioAction<FirefliesTranscriptInput, FirefliesMeeting[]>(
    COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS,
    input,
    connectionId,
    userId,
  );
}

export async function getFirefliesTranscript(
  meetingId: string,
  connectionId: string,
  userId: string,
): Promise<FirefliesTranscript> {
  return executeComposioAction<{ meetingId: string }, FirefliesTranscript>(
    COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT,
    { meetingId },
    connectionId,
    userId,
  );
}

export async function searchFirefliesMeetings(
  query: string,
  connectionId: string,
  userId: string,
): Promise<FirefliesMeeting[]> {
  return executeComposioAction<{ query: string }, FirefliesMeeting[]>(
    COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_MEETINGS,
    { query },
    connectionId,
    userId,
  );
}
