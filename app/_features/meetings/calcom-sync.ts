"use server";

/**
 * Cal.com Sync Actions
 *
 * Syncs meeting types to Cal.com as event types.
 */

import { createClient } from "@/app/_lib/supabase/server";
import {
  createCalcomEventType,
  updateCalcomEventType,
  deleteCalcomEventType,
  convertToCalcomBookingFields,
  getConnectedConferencingApps,
  type ConferencingApp,
} from "@/app/_lib/calcom/api";
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
    .from("studio_integrations")
    .select("id")
    .eq("studio_id", studioId)
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

  const apps = await getConnectedConferencingApps(studioId);
  return { apps };
}

// Re-export the type for use in components
export type { ConferencingApp };

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
    let location: Record<string, unknown> | null = null;
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
    const calcomInput: Record<string, unknown> = {
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
      calcomInput.bookingFields = bookingQuestions.map((q, index) => ({
        type: q.type === "textarea" ? "textarea" : "text",
        slug: q.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) || `question-${index + 1}`,
        label: q.label,
        required: q.required,
      }));
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
    .from("studio_members")
    .select("studio_id")
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
