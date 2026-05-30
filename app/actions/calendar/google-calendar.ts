"use server";

/**
 * Google Calendar Integration (via Composio)
 *
 * Replaces the previous googleapis-based implementation.
 * Now uses Composio for OAuth, auth lifecycle, and API actions.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { createCalendarEvent, listCalendarEvents, updateCalendarEvent, deleteCalendarEvent } from "@/app/_lib/composio/actions";
import type { CalendarEventInput, CalendarEvent } from "@/app/_lib/composio/types";

/**
 * Get active Composio connection ID for Google Calendar
 */
export async function getCalendarConnection(userId: string) {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from("studio_integrations")
    .select("composio_connection_id, composio_status")
    .eq("user_id", userId)
    .eq("provider", "composio:googlecalendar")
    .eq("composio_status", "connected")
    .single();

  return integration;
}

/**
 * List upcoming calendar events via Composio
 */
export async function fetchCalendarEvents(
  userId: string,
  options?: { timeMin?: string; timeMax?: string; maxResults?: number },
): Promise<CalendarEvent[]> {
  const connection = await getCalendarConnection(userId);
  if (!connection?.composio_connection_id) {
    throw new Error("Google Calendar is not connected. Connect it in Settings.");
  }

  return listCalendarEvents(
    {
      timeMin: options?.timeMin ?? new Date().toISOString(),
      timeMax: options?.timeMax,
      maxResults: options?.maxResults ?? 50,
      orderBy: "startTime",
    },
    connection.composio_connection_id,
  );
}

/**
 * Create a calendar event via Composio
 */
export async function createEvent(
  userId: string,
  input: CalendarEventInput,
): Promise<CalendarEvent> {
  const connection = await getCalendarConnection(userId);
  if (!connection?.composio_connection_id) {
    throw new Error("Google Calendar is not connected.");
  }

  return createCalendarEvent(input, connection.composio_connection_id);
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  userId: string,
  eventId: string,
  input: Partial<CalendarEventInput>,
): Promise<CalendarEvent> {
  const connection = await getCalendarConnection(userId);
  if (!connection?.composio_connection_id) {
    throw new Error("Google Calendar is not connected.");
  }

  return updateCalendarEvent(eventId, input, connection.composio_connection_id);
}

/**
 * Delete a calendar event
 */
export async function removeEvent(
  userId: string,
  eventId: string,
): Promise<void> {
  const connection = await getCalendarConnection(userId);
  if (!connection?.composio_connection_id) {
    throw new Error("Google Calendar is not connected.");
  }

  return deleteCalendarEvent(eventId, connection.composio_connection_id);
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectCalendar(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("studio_integrations")
    .update({ composio_status: "disconnected", composio_connection_id: null })
    .eq("user_id", userId)
    .eq("provider", "composio:googlecalendar");

  if (error) {
    throw new Error("Failed to disconnect Google Calendar");
  }

  return { success: true };
}