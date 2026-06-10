"use server";

/**
 * Cal.com Sync Actions
 *
 * Bidirectional sync between Salt and Cal.com:
 * - Outbound: Syncs meeting types TO Cal.com as event types
 * - Inbound: Syncs bookings FROM Cal.com, auto-creating leads
 */

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  createCalcomEventType,
  updateCalcomEventType,
  deleteCalcomEventType,
  convertToCalcomBookingFields,
  getConnectedConferencingApps,
  getCalcomBookings,
  CalcomCredentialsExpiredError,
  type ConferencingApp,
  type CalcomBooking,
  type CreateEventTypeInput,
  type CalcomLocation,
} from "@/app/_lib/calcom/api";
import { createClientFromBooking } from "@/app/actions/clients/create-client-from-booking";
import type { MeetingType, BookingQuestion } from "./types";

interface SyncResult {
  success: boolean;
  error?: string;
  calEventTypeId?: string;
}

/**
 * Check if a studio has Cal.com connected.
 */
export async function isCalcomConnected(studioId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("workspace_integrations")
    .select("id")
    .eq("workspace_id", studioId)
    .eq("provider", "calcom")
    .eq("is_active", true)
    .single();

  return !!data;
}

/**
 * Get available conferencing apps for the current user's studio.
 * Returns apps connected in Cal.com (Zoom, Google Meet, etc.)
 */
export async function getAvailableConferencingApps(): Promise<{
  apps: ConferencingApp[];
  error?: string;
}> {
  const studioId = await getCurrentStudioId();
  if (!studioId) {
    return { apps: [], error: "No studio context" };
  }

  const connected = await isCalcomConnected(studioId);
  if (!connected) {
    return { apps: [], error: "Cal.com not connected" };
  }

  try {
    const apps = await getConnectedConferencingApps(studioId);
    return { apps };
  } catch (error) {
    if (error instanceof CalcomCredentialsExpiredError) {
      return { apps: [], error: "Cal.com credentials expired - please reconnect" };
    }
    throw error;
  }
}

// Re-export the type for use in components
export type { ConferencingApp };

/**
 * Manually trigger a booking sync for the current user's studio.
 * Can be called from Settings or anywhere in the app.
 */
export async function manualSyncBookingsFromCalcom(): Promise<BookingSyncResult> {
  const studioId = await getCurrentStudioId();
  if (!studioId) {
    return {
      success: false,
      synced: 0,
      skipped: 0,
      leadsCreated: 0,
      errors: ["No studio context found"],
    };
  }

  return syncBookingsFromCalcom(studioId);
}

// =============================================================================
// BACKGROUND SYNC (Page Load Trigger)
// =============================================================================

// In-memory cache to debounce syncs (prevents hammering on rapid page loads)
const lastSyncAttempt = new Map<string, number>();
const SYNC_DEBOUNCE_MS = 60 * 1000; // Only sync once per minute per studio

/**
 * Trigger a background sync when a page loads.
 * - Non-blocking: returns immediately, sync happens in background
 * - Debounced: won't sync if synced within the last minute
 * - Silent: errors are logged but not thrown
 *
 * Call this from pages like /clients, /sales/pipeline, etc.
 */
export async function triggerBackgroundBookingSync(): Promise<void> {
  const studioId = await getCurrentStudioId();
  if (!studioId) return;

  // Check if Cal.com is connected
  const connected = await isCalcomConnected(studioId);
  if (!connected) return;

  // Debounce: skip if we synced recently
  const lastAttempt = lastSyncAttempt.get(studioId) || 0;
  const now = Date.now();
  if (now - lastAttempt < SYNC_DEBOUNCE_MS) {
    return;
  }

  // Mark sync attempt
  lastSyncAttempt.set(studioId, now);

  // Run sync in background (don't await)
  syncBookingsFromCalcom(studioId)
    .then((result) => {
      if (result.synced > 0 || result.leadsCreated > 0) {
        console.log(
          `[Background Sync] Studio ${studioId}: ${result.synced} bookings, ${result.leadsCreated} leads`
        );
      }
    })
    .catch((err) => {
      console.error(`[Background Sync] Studio ${studioId} failed:`, err);
    });
}

/**
 * Sync a meeting type to Cal.com.
 * Creates a new event type if none exists, or updates the existing one.
 */
export async function syncMeetingTypeToCalcom(
  meetingType: MeetingType
): Promise<SyncResult> {
  const supabase = await createClient();

  // Check if Cal.com is connected
  const connected = await isCalcomConnected(meetingType.studio_id);
  if (!connected) {
    return { success: false, error: "Cal.com not connected" };
  }

  try {
    // Map location to Cal.com format
    let location: CalcomLocation | null = null;
    switch (meetingType.location) {
      case "cal_video":
        location = { type: "integration", integration: "cal-video" };
        break;
      case "google_meet":
        location = { type: "integration", integration: "google-meet" };
        break;
      case "zoom":
        location = { type: "integration", integration: "zoom" };
        break;
      case "phone":
        if (meetingType.location_phone) {
          location = { type: "phone", hostPhoneNumber: meetingType.location_phone };
        }
        break;
      case "in_person":
        if (meetingType.location_address) {
          location = { type: "address", address: meetingType.location_address };
        }
        break;
      case "link":
        if (meetingType.location_link) {
          location = { type: "link", link: meetingType.location_link };
        }
        break;
    }

    // Build Cal.com input
    const calcomInput: CreateEventTypeInput = {
      title: meetingType.name,
      slug: meetingType.slug,
      lengthInMinutes: meetingType.duration_minutes,
    };

    // Add optional fields
    if (meetingType.description) {
      calcomInput.description = meetingType.description;
    }

    // Add location if valid
    if (location) {
      calcomInput.locations = [location];
    }

    // Buffer times (in minutes)
    if (meetingType.buffer_minutes && meetingType.buffer_minutes > 0) {
      calcomInput.beforeEventBuffer = meetingType.buffer_minutes;
      calcomInput.afterEventBuffer = meetingType.buffer_minutes;
    }

    // Minimum booking notice (convert hours to minutes)
    if (meetingType.min_notice_hours && meetingType.min_notice_hours > 0) {
      calcomInput.minimumBookingNotice = meetingType.min_notice_hours * 60;
    }

    // Booking questions - Cal.com API v2 format
    const bookingQuestions = meetingType.booking_questions || [];
    if (bookingQuestions.length > 0) {
      calcomInput.bookingFields = convertToCalcomBookingFields(bookingQuestions);
    }

    // Require confirmation setting
    if (meetingType.requires_confirmation) {
      calcomInput.confirmationPolicy = {
        type: "always",
      };
    }

    // Note: Pricing requires Cal.com paid plan - not syncing for now

    // Note: Cal Video transcription settings must be configured in Cal.com Settings > Cal AI
    // The API doesn't reliably apply calVideoSettings per-event-type

    let calEventTypeId = meetingType.cal_event_type_id;

    if (calEventTypeId) {
      // Try to update existing event type
      try {
        console.log("Updating Cal.com event type:", calEventTypeId, calcomInput);
        const updateResult = await updateCalcomEventType(
          meetingType.studio_id,
          calEventTypeId,
          calcomInput
        );
        console.log("Update result:", updateResult);
      } catch (updateError) {
        // If event type not found in Cal.com, create a new one
        const errorMsg = updateError instanceof Error ? updateError.message : "";
        if (errorMsg.includes("not found") || errorMsg.includes("404")) {
          console.log("Cal.com event type not found, creating new one");
          const response = await createCalcomEventType(
            meetingType.studio_id,
            calcomInput
          );
          calEventTypeId = String(response.data.id);
        } else {
          // Re-throw other errors
          throw updateError;
        }
      }
    } else {
      // Create new event type
      const response = await createCalcomEventType(
        meetingType.studio_id,
        calcomInput
      );
      calEventTypeId = String(response.data.id);
    }

    // Update the meeting type with Cal.com ID and sync timestamp
    await supabase
      .from("meeting_types")
      .update({
        cal_event_type_id: calEventTypeId,
        cal_synced_at: new Date().toISOString(),
      })
      .eq("id", meetingType.id);

    return { success: true, calEventTypeId };
  } catch (error) {
    console.error("Failed to sync meeting type to Cal.com:", error);
    if (error instanceof CalcomCredentialsExpiredError) {
      return {
        success: false,
        error: "Cal.com credentials expired - please reconnect",
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

/**
 * Get current user's studio ID from session.
 */
async function getCurrentStudioId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("workspace_members")
    .select("studio_id:workspace_id")
    .eq("user_id", user.id)
    .single();

  return member?.studio_id || null;
}

/**
 * Sync all meeting types for a studio to Cal.com.
 * If studioId is not provided, uses the current user's studio.
 */
export async function syncAllMeetingTypesToCalcom(
  studioId?: string
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const supabase = await createClient();

  // Get studioId from session if not provided
  const resolvedStudioId = studioId || await getCurrentStudioId();
  if (!resolvedStudioId) {
    return { synced: 0, failed: 0, errors: ["No studio context found"] };
  }

  // Check if Cal.com is connected
  const connected = await isCalcomConnected(resolvedStudioId);
  if (!connected) {
    return { synced: 0, failed: 0, errors: ["Cal.com not connected"] };
  }

  // Get all active meeting types for the studio
  const { data: meetingTypes, error } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("studio_id", resolvedStudioId)
    .eq("is_active", true);

  if (error || !meetingTypes) {
    return { synced: 0, failed: 0, errors: ["Failed to fetch meeting types"] };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const mt of meetingTypes) {
    const result = await syncMeetingTypeToCalcom(mt as MeetingType);
    if (result.success) {
      synced++;
    } else {
      failed++;
      errors.push(`${mt.name}: ${result.error}`);
    }
  }

  return { synced, failed, errors };
}

/**
 * Delete a meeting type from Cal.com.
 */
export async function deleteMeetingTypeFromCalcom(
  studioId: string,
  calEventTypeId: string
): Promise<SyncResult> {
  try {
    await deleteCalcomEventType(studioId, calEventTypeId);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete event type from Cal.com:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

/**
 * Resync a single meeting type by ID.
 */
export async function resyncMeetingType(
  meetingTypeId: string
): Promise<SyncResult> {
  const supabase = await createClient();

  const { data: meetingType, error } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("id", meetingTypeId)
    .single();

  if (error || !meetingType) {
    return { success: false, error: "Meeting type not found" };
  }

  return syncMeetingTypeToCalcom(meetingType as MeetingType);
}

// =============================================================================
// INBOUND BOOKING SYNC (Cal.com → Salt)
// =============================================================================

export interface BookingSyncResult {
  success: boolean;
  synced: number;
  skipped: number;
  leadsCreated: number;
  errors: string[];
}

/**
 * Sync bookings from Cal.com for a single studio.
 * Creates client records (leads) and meeting records for new bookings.
 */
export async function syncBookingsFromCalcom(
  studioId: string
): Promise<BookingSyncResult> {
  const supabase = createAdminClient();

  // Get the integration to check last sync time
  const { data: integration, error: intError } = await supabase
    .from("workspace_integrations")
    .select("id, config, last_synced_at")
    .eq("workspace_id", studioId)
    .eq("provider", "calcom")
    .eq("is_active", true)
    .single();

  if (intError || !integration) {
    return {
      success: false,
      synced: 0,
      skipped: 0,
      leadsCreated: 0,
      errors: ["Cal.com integration not found or inactive"],
    };
  }

  const result: BookingSyncResult = {
    success: true,
    synced: 0,
    skipped: 0,
    leadsCreated: 0,
    errors: [],
  };

  try {
    // Fetch bookings since last sync (or last 30 days if first sync)
    const lastSync = integration.last_synced_at
      ? new Date(integration.last_synced_at)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const bookings = await getCalcomBookings(studioId, {
      afterCreatedAt: lastSync.toISOString(),
      status: ["upcoming", "unconfirmed"], // Upcoming = confirmed, unconfirmed = pending
      sortStart: "asc",
      take: 100,
    });

    console.log(
      `[Cal.com Sync] Studio ${studioId}: Found ${bookings.length} bookings since ${lastSync.toISOString()}`
    );

    for (const booking of bookings) {
      try {
        // Check if we already have this booking
        const { data: existing } = await supabase
          .from("client_meetings")
          .select("id")
          .eq("cal_booking_id", String(booking.id))
          .single();

        if (existing) {
          result.skipped++;
          continue;
        }

        // Get the booker (first attendee who isn't a host)
        const hostEmails = new Set(
          booking.hosts?.map((h) => h.email.toLowerCase()) || []
        );
        const booker = booking.attendees.find(
          (a) => !hostEmails.has(a.email.toLowerCase())
        );

        if (!booker) {
          result.errors.push(
            `Booking ${booking.uid}: No attendee found (only hosts)`
          );
          continue;
        }

        // Create or find client
        const clientResult = await createClientFromBooking({
          studioId,
          attendee: {
            name: booker.name || booker.email.split("@")[0],
            email: booker.email,
          },
          source: "cal_booking_sync",
          notes: `Synced from Cal.com: ${booking.title}`,
        });

        if (!clientResult.success) {
          result.errors.push(
            `Booking ${booking.uid}: Failed to create client - ${clientResult.error}`
          );
          continue;
        }

        if (clientResult.isNew) {
          result.leadsCreated++;
        }

        // Create meeting record
        const attendees = booking.attendees.map((a) => ({
          name: a.name,
          email: a.email,
          role: hostEmails.has(a.email.toLowerCase()) ? "organizer" : "attendee",
        }));

        // Add hosts as organizers if not already in attendees
        for (const host of booking.hosts || []) {
          if (!attendees.some((a) => a.email.toLowerCase() === host.email.toLowerCase())) {
            attendees.unshift({
              name: host.name,
              email: host.email,
              role: "organizer",
            });
          }
        }

        const { error: insertError } = await supabase
          .from("client_meetings")
          .insert({
            studio_id: studioId,
            client_id: clientResult.clientId,
            title: booking.title,
            description: booking.description || null,
            meeting_type: "discovery", // Default, could be smarter based on event type
            start_time: booking.start,
            end_time: booking.end,
            location_type: parseLocationFromBooking(booking.location),
            meeting_url: booking.meetingUrl || null,
            status: booking.status === "cancelled" ? "cancelled" : "scheduled",
            visibility: "shared_with_client",
            cal_booking_id: String(booking.id),
            cal_event_uid: booking.uid,
            origin: "internal",
            attendees,
          });

        if (insertError) {
          result.errors.push(
            `Booking ${booking.uid}: Failed to create meeting - ${insertError.message}`
          );
          continue;
        }

        result.synced++;
      } catch (bookingError) {
        const msg =
          bookingError instanceof Error
            ? bookingError.message
            : "Unknown error";
        result.errors.push(`Booking ${booking.uid}: ${msg}`);
      }
    }

    // Update last sync time
    await supabase
      .from("workspace_integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", integration.id);

    console.log(
      `[Cal.com Sync] Studio ${studioId}: Synced ${result.synced}, skipped ${result.skipped}, leads created ${result.leadsCreated}`
    );
  } catch (error) {
    result.success = false;
    if (error instanceof CalcomCredentialsExpiredError) {
      result.errors.push("Cal.com credentials expired - please reconnect in Settings → Integrations");
      console.warn(`[Cal.com Sync] Studio ${studioId}: Credentials expired, needs reconnection`);
    } else {
      result.errors.push(
        error instanceof Error ? error.message : "Sync failed"
      );
    }
  }

  return result;
}

/**
 * Parse location type from Cal.com booking location string.
 */
function parseLocationFromBooking(
  location?: string
): "google-meet" | "zoom" | "phone" | "in-person" | "custom" | null {
  if (!location) return null;

  const loc = location.toLowerCase();
  if (loc.includes("google") || loc.includes("meet")) return "google-meet";
  if (loc.includes("zoom")) return "zoom";
  if (loc.includes("phone") || loc.includes("call")) return "phone";
  if (loc.includes("office") || loc.includes("address")) return "in-person";
  return "custom";
}

/**
 * Sync bookings for ALL studios with active Cal.com integrations.
 * Intended to be called by a cron job.
 */
export async function syncAllStudiosBookingsFromCalcom(): Promise<{
  studiosProcessed: number;
  totalSynced: number;
  totalLeadsCreated: number;
  errors: string[];
}> {
  const supabase = createAdminClient();

  // Get all studios with active Cal.com integrations
  const { data: integrations, error } = await supabase
    .from("workspace_integrations")
    .select("studio_id:workspace_id")
    .eq("provider", "calcom")
    .eq("is_active", true);

  if (error || !integrations) {
    return {
      studiosProcessed: 0,
      totalSynced: 0,
      totalLeadsCreated: 0,
      errors: ["Failed to fetch integrations"],
    };
  }

  const result = {
    studiosProcessed: 0,
    totalSynced: 0,
    totalLeadsCreated: 0,
    errors: [] as string[],
  };

  for (const { studio_id } of integrations) {
    try {
      const syncResult = await syncBookingsFromCalcom(studio_id);
      result.studiosProcessed++;
      result.totalSynced += syncResult.synced;
      result.totalLeadsCreated += syncResult.leadsCreated;

      if (syncResult.errors.length > 0) {
        result.errors.push(
          `Studio ${studio_id}: ${syncResult.errors.join(", ")}`
        );
      }
    } catch (studioError) {
      result.errors.push(
        `Studio ${studio_id}: ${studioError instanceof Error ? studioError.message : "Unknown error"}`
      );
    }
  }

  console.log(
    `[Cal.com Sync] All studios: ${result.studiosProcessed} processed, ${result.totalSynced} synced, ${result.totalLeadsCreated} leads created`
  );

  return result;
}
