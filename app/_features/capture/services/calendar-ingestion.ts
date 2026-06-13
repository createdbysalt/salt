/**
 * Calendar Ingestion Service
 *
 * Ingests events from Google Calendar and other calendar connectors.
 * Captures meetings, creates routing decisions, and links to People.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import { CONFIDENCE_THRESHOLDS, BOOTSTRAP_LIMITS } from "../types";
import { calculateSurfaceConfidence } from "./confidence";
import type { MemorySurface } from "../types";

// ============================================================================
// Types
// ============================================================================

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  organizer?: { email: string; displayName?: string };
  status?: string;
  htmlLink?: string;
}

interface IngestionResult {
  success: boolean;
  capturesCreated: number;
  error?: string;
}

// ============================================================================
// Calendar Ingestion
// ============================================================================

/**
 * Ingest calendar events from the past N days.
 */
export async function ingestCalendarEvents(
  workspaceId: string,
  options: {
    lookbackDays?: number;
    limit?: number;
    isBootstrap?: boolean;
  } = {}
): Promise<IngestionResult> {
  const {
    lookbackDays = options.isBootstrap ? BOOTSTRAP_LIMITS.LOOKBACK_DAYS : 7,
    limit = options.isBootstrap ? 50 : 20,
    isBootstrap = false,
  } = options;

  const admin = createAdminClient();

  // Get Google Calendar connection
  const connectionStatus = await getConnectionStatus("googlecalendar", workspaceId);
  if (!connectionStatus.connected || !connectionStatus.composioConnectionId) {
    return { success: false, capturesCreated: 0, error: "Google Calendar not connected" };
  }
  const connectionId = connectionStatus.composioConnectionId;

  // Calculate time range
  const timeMin = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date().toISOString();

  // Fetch events via Composio
  let events: CalendarEvent[] = [];
  try {
    const response = await fetch(
      `https://backend.composio.dev/api/v2/actions/GOOGLE_CALENDAR_LIST_EVENTS/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.COMPOSIO_API_KEY!,
        },
        body: JSON.stringify({
          connectedAccountId: connectionId,
          input: {
            calendarId: "primary",
            timeMin,
            timeMax,
            maxResults: limit,
            singleEvents: true,
            orderBy: "startTime",
          },
        }),
      }
    );

    const result = await response.json();
    events = (result.data?.items ?? []) as CalendarEvent[];
  } catch (error) {
    console.error("[calendar-ingestion] Failed to fetch events:", error);
    return { success: false, capturesCreated: 0, error: "Failed to fetch calendar events" };
  }

  if (events.length === 0) {
    return { success: true, capturesCreated: 0 };
  }

  // Filter out declined events and all-day events without meaningful content
  const meaningfulEvents = events.filter((event) => {
    if (event.status === "cancelled") return false;
    if (!event.summary && !event.description) return false;
    return true;
  });

  // Check for existing captures to avoid duplicates
  const externalIds = meaningfulEvents.map((e) => `google_calendar:${e.id}`);
  const { data: existing } = await admin
    .from("capture_events")
    .select("external_id")
    .eq("workspace_id", workspaceId)
    .in("external_id", externalIds);

  const existingIds = new Set(existing?.map((e) => e.external_id) ?? []);
  const newEvents = meaningfulEvents.filter(
    (e) => !existingIds.has(`google_calendar:${e.id}`)
  );

  if (newEvents.length === 0) {
    return { success: true, capturesCreated: 0 };
  }

  // Create captures
  const captures = newEvents.map((event) => {
    const attendeeEmails = event.attendees?.map((a) => a.email) ?? [];
    const eventStart = event.start.dateTime ?? event.start.date ?? "";

    return {
      workspace_id: workspaceId,
      source_type: "google_calendar" as const,
      capture_type: "meeting" as const,
      origin: "found" as const,
      external_id: `google_calendar:${event.id}`,
      title: event.summary || "Untitled meeting",
      raw_payload: event,
      extracted_data: {
        type: "meeting",
        title: event.summary,
        description: event.description,
        start: eventStart,
        end: event.end.dateTime ?? event.end.date,
        attendees: attendeeEmails,
        organizer: event.organizer?.email,
        link: event.htmlLink,
      },
      state: "pending" as const,
    };
  });

  const { data: insertedCaptures, error: insertError } = await admin
    .from("capture_events")
    .insert(captures)
    .select("id, extracted_data");

  if (insertError) {
    console.error("[calendar-ingestion] Failed to insert captures:", insertError);
    return { success: false, capturesCreated: 0, error: "Failed to create captures" };
  }

  // Create routing decisions
  const routingDecisions = insertedCaptures?.flatMap((capture) => {
    const extracted = capture.extracted_data as { attendees?: string[] };
    const surfaces: MemorySurface[] = ["meetings"];

    // Also route to people if we have attendees
    if (extracted.attendees && extracted.attendees.length > 0) {
      surfaces.push("people");
    }

    return surfaces.map((surface) => ({
      capture_event_id: capture.id,
      target_surface: surface,
      confidence: surface === "meetings" ? 95 : 80,
      status: surface === "meetings" ? "approved" : "pending",
      routing_action: "route" as const,
      routed_at: surface === "meetings" ? new Date().toISOString() : null,
    }));
  }) ?? [];

  if (routingDecisions.length > 0) {
    await admin.from("capture_routing_decisions").insert(routingDecisions);
  }

  // Update capture states for auto-routed ones
  const autoRoutedIds = insertedCaptures?.map((c) => c.id) ?? [];
  if (autoRoutedIds.length > 0) {
    await admin
      .from("capture_events")
      .update({ state: "routed", processed_at: new Date().toISOString() })
      .in("id", autoRoutedIds);
  }

  return { success: true, capturesCreated: insertedCaptures?.length ?? 0 };
}

/**
 * Run calendar bootstrap on first connection.
 */
export async function runCalendarBootstrap(workspaceId: string): Promise<IngestionResult> {
  console.log(`[calendar-ingestion] Running bootstrap for workspace ${workspaceId}`);

  const result = await ingestCalendarEvents(workspaceId, {
    isBootstrap: true,
    lookbackDays: 30, // Look back 30 days for meetings
    limit: 50,
  });

  console.log(
    `[calendar-ingestion] Bootstrap complete: ${result.capturesCreated} captures created`
  );

  return result;
}
