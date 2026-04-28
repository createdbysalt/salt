/**
 * Recall.ai Calendar Webhook Handler
 *
 * Processes calendar sync events from Recall.ai Calendar V2 API.
 * When calendar events are added/updated, checks if any attendee is a client
 * and schedules a Recall bot to record the meeting.
 *
 * Events handled:
 * - calendar.sync_events: Calendar events updated, fetch and process
 * - calendar.disconnected: Calendar OAuth revoked
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  listCalendarEvents,
  scheduleBotForEvent,
  getScheduledBot,
  deleteBotForEvent,
  generateBotName,
  RecallError,
} from "@/app/_lib/recall";
import type {
  RecallCalendarWebhook,
  CalendarSyncWebhook,
  CalendarDisconnectedWebhook,
  RecallCalendarEvent,
  ShouldRecordResult,
} from "@/app/_lib/recall";
import { NextRequest, NextResponse } from "next/server";

// Svix webhook verification (Recall uses Svix for calendar webhooks)
// const RECALL_CALENDAR_WEBHOOK_SECRET = process.env.RECALL_CALENDAR_WEBHOOK_SECRET;

/**
 * Check if a calendar event should be recorded.
 * Returns true if any attendee email matches a client in the studio.
 */
async function shouldRecordEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: RecallCalendarEvent,
  studioId: string
): Promise<ShouldRecordResult> {
  // Must have a video meeting URL
  if (!event.meeting_url) {
    return { record: false, reason: "No meeting URL" };
  }

  // Must be confirmed (not cancelled)
  if (event.status === "cancelled") {
    return { record: false, reason: "Event cancelled" };
  }

  // Get all client emails for this studio
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("studio_id", studioId)
    .not("email", "is", null);

  if (error || !clients) {
    console.error("Failed to fetch clients for matching:", error);
    return { record: false, reason: "Failed to fetch clients" };
  }

  // Build email lookup map (lowercase for case-insensitive matching)
  const clientsByEmail = new Map(
    clients
      .filter((c) => c.email)
      .map((c) => [c.email!.toLowerCase(), { id: c.id, name: c.name }])
  );

  // Check if any attendee is a client
  for (const attendee of event.attendees) {
    const clientMatch = clientsByEmail.get(attendee.email.toLowerCase());
    if (clientMatch) {
      return {
        record: true,
        clientId: clientMatch.id,
        clientName: clientMatch.name,
        reason: `Matched client: ${clientMatch.name}`,
      };
    }
  }

  return { record: false, reason: "No attendee matches a client" };
}

/**
 * Process updated calendar events.
 * For each event, check if it should be recorded and schedule/update bot.
 */
async function processCalendarEvents(
  supabase: ReturnType<typeof createAdminClient>,
  calendarId: string,
  lastUpdatedTs: string
): Promise<void> {
  // Get calendar connection to find studio
  const { data: connection, error: connError } = await supabase
    .from("studio_calendar_connections")
    .select("studio_id, auto_record_client_meetings, bot_name_override")
    .eq("recall_calendar_id", calendarId)
    .eq("is_active", true)
    .single();

  if (connError || !connection) {
    console.error(`No active calendar connection found for ${calendarId}`);
    return;
  }

  // Skip if auto-recording is disabled
  if (!connection.auto_record_client_meetings) {
    console.log(`Auto-recording disabled for calendar ${calendarId}`);
    return;
  }

  // Get studio name for bot naming
  const { data: studio } = await supabase
    .from("studios")
    .select("name")
    .eq("id", connection.studio_id)
    .single();

  const botName =
    connection.bot_name_override || generateBotName(studio?.name || "Studio");

  // Fetch updated events from Recall
  const { results: events } = await listCalendarEvents(calendarId, {
    updatedAfter: lastUpdatedTs,
    // Only look at events in the next 7 days
    startTimeMin: new Date().toISOString(),
    startTimeMax: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });

  console.log(
    `Processing ${events.length} updated events for calendar ${calendarId}`
  );

  for (const event of events) {
    try {
      const result = await shouldRecordEvent(
        supabase,
        event,
        connection.studio_id
      );

      // Check if bot is already scheduled
      const existingBot = await getScheduledBot(calendarId, event.id);

      if (result.record) {
        if (!existingBot) {
          // Schedule new bot
          await scheduleBotForEvent(calendarId, event.id, {
            bot_name: botName,
            transcription_options: { provider: "recall" },
            automatic_leave: {
              waiting_room_timeout: 300,
              noone_joined_timeout: 300,
              everyone_left_timeout: 60,
            },
            metadata: {
              studio_id: connection.studio_id,
              client_id: result.clientId || "",
              source: "calendar_integration",
            },
          });
          console.log(
            `Scheduled bot for event ${event.id}: ${event.title} (${result.reason})`
          );
        } else {
          console.log(
            `Bot already scheduled for event ${event.id}: ${event.title}`
          );
        }
      } else if (existingBot && event.status === "cancelled") {
        // Event was cancelled, remove the bot
        await deleteBotForEvent(calendarId, event.id);
        console.log(
          `Removed bot for cancelled event ${event.id}: ${event.title}`
        );
      }
    } catch (err) {
      console.error(`Failed to process event ${event.id}:`, err);
    }
  }

  // Update last sync time
  await supabase
    .from("studio_calendar_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      sync_error: null,
    })
    .eq("recall_calendar_id", calendarId);
}

/**
 * Handle calendar.sync_events webhook.
 */
async function handleCalendarSync(
  supabase: ReturnType<typeof createAdminClient>,
  data: CalendarSyncWebhook["data"]
): Promise<void> {
  const { calendar_id, last_updated_ts } = data;

  console.log(`Processing calendar sync for ${calendar_id} since ${last_updated_ts}`);

  await processCalendarEvents(supabase, calendar_id, last_updated_ts);
}

/**
 * Handle calendar.disconnected webhook.
 */
async function handleCalendarDisconnected(
  supabase: ReturnType<typeof createAdminClient>,
  data: CalendarDisconnectedWebhook["data"]
): Promise<void> {
  const { calendar_id, reason } = data;

  console.log(`Calendar disconnected: ${calendar_id} - ${reason}`);

  // Mark the connection as inactive
  await supabase
    .from("studio_calendar_connections")
    .update({
      is_active: false,
      disconnected_at: new Date().toISOString(),
      sync_error: `Disconnected: ${reason}`,
    })
    .eq("recall_calendar_id", calendar_id);
}

/**
 * POST handler for Recall Calendar webhooks
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  // TODO: Verify Svix signature
  // For now, proceed without verification in development

  // Parse payload
  let webhookPayload: RecallCalendarWebhook;
  try {
    webhookPayload = JSON.parse(body) as RecallCalendarWebhook;
  } catch (err) {
    console.error("Failed to parse Recall Calendar webhook payload:", err);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { event, data } = webhookPayload;
  const supabase = createAdminClient();

  console.log(`Processing Recall Calendar webhook: ${event}`);

  try {
    switch (event) {
      case "calendar.sync_events":
        await handleCalendarSync(
          supabase,
          data as CalendarSyncWebhook["data"]
        );
        break;

      case "calendar.disconnected":
        await handleCalendarDisconnected(
          supabase,
          data as CalendarDisconnectedWebhook["data"]
        );
        break;

      default:
        console.log(`Unhandled Recall Calendar webhook event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Recall Calendar webhook error for ${event}:`, errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
