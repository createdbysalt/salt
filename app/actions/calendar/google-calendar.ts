"use server";

/**
 * Google Calendar Integration
 *
 * Note: This feature requires the 'googleapis' package to be installed
 * npm install googleapis
 *
 * Until installed, these functions return errors gracefully.
 */

import { createClient } from "@/libs/supabase/server";

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
 * Requires googleapis package to be installed
 */
export async function createGoogleCalendarClient(_userId: string) {
  throw new Error("Google Calendar integration requires the googleapis package. Run: npm install googleapis");
}

/**
 * Sync Google Calendar events to client_meetings
 * Requires googleapis package to be installed
 */
export async function syncGoogleCalendar(_userId: string, _studioId: string) {
  return {
    success: false,
    synced: 0,
    error: "Google Calendar integration requires the googleapis package. Run: npm install googleapis"
  };
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
