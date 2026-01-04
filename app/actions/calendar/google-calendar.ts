"use server";

import { createClient } from "@/libs/supabase/server";
import { google } from "googleapis";
import { decryptToken, encryptToken } from "@/libs/calendar-encryption";

/**
 * Get active calendar connection for current user
 */
export async function getCalendarConnection(userId: string, provider: string = "google") {
  const supabase = await createClient();

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_active", true)
    .single();

  return connection;
}

/**
 * Create authenticated Google Calendar client
 */
export async function createGoogleCalendarClient(userId: string) {
  const connection = await getCalendarConnection(userId, "google");
  
  if (!connection) {
    throw new Error("No active Google Calendar connection found");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
  );

  // Decrypt tokens
  const accessToken = decryptToken(connection.access_token_ciphertext);
  const refreshToken = connection.refresh_token_ciphertext
    ? decryptToken(connection.refresh_token_ciphertext)
    : null;

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.token_expires_at
      ? new Date(connection.token_expires_at).getTime()
      : undefined,
  });

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      const supabase = await createClient();
      await supabase
        .from("calendar_connections")
        .update({
          access_token_ciphertext: encryptToken(tokens.access_token),
          token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
        })
        .eq("id", connection.id);
    }
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  return { calendar, connection };
}

/**
 * Sync Google Calendar events to client_meetings
 */
export async function syncGoogleCalendar(userId: string, studioId: string) {
  const supabase = await createClient();
  
  try {
    const { calendar, connection } = await createGoogleCalendarClient(userId);

    // Get events from last sync (or last 30 days if first sync)
    const timeMin = connection.last_synced_at
      ? new Date(connection.last_synced_at)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    // Import events as client_meetings
    for (const event of events) {
      if (!event.start?.dateTime || !event.end?.dateTime) {
        continue; // Skip all-day events
      }

      // Check if already imported
      const { data: existing } = await supabase
        .from("client_meetings")
        .select("id")
        .eq("external_provider", "google")
        .eq("external_event_id", event.id)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from("client_meetings")
          .update({
            title: event.summary || "Untitled Event",
            description: event.description || null,
            start_time: event.start.dateTime,
            end_time: event.end.dateTime,
            meeting_url: event.hangoutLink || null,
            location_type: event.hangoutLink ? "google-meet" : "custom",
            external_updated_at: event.updated,
            external_etag: event.etag || null,
          })
          .eq("id", existing.id);
      }
      // Note: We don't auto-create meetings from Google without client assignment
      // Studio can manually link or we add a UI for this
    }

    // Update last synced timestamp
    await supabase
      .from("calendar_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection.id);

    return { success: true, synced: events.length };
  } catch (error) {
    console.error("Error syncing Google Calendar:", error);
    throw error;
  }
}

/**
 * Disconnect calendar
 */
export async function disconnectCalendar(userId: string, provider: string = "google") {
  const supabase = await createClient();

  const { error } = await supabase
    .from("calendar_connections")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    throw new Error("Failed to disconnect calendar");
  }

  return { success: true };
}

