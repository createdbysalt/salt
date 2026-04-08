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
    // Map Salt Core location to Cal.com location format
    // These match Cal.com's UI options
    let locations;
    switch (meetingType.location) {
      case "cal_video":
        locations = [{ type: "integration", integration: "cal-video" }];
        break;
      case "google_meet":
        locations = [{ type: "integration", integration: "google-meet" }];
        break;
      case "zoom":
        locations = [{ type: "integration", integration: "zoom" }];
        break;
      case "phone":
        locations = [{
          type: "phone",
          phone: meetingType.location_phone || undefined,
        }];
        break;
      case "in_person":
        locations = [{
          type: "inPerson",
          address: meetingType.location_address || undefined,
        }];
        break;
      case "link":
        locations = [{
          type: "link",
          link: meetingType.location_link || undefined,
        }];
        break;
      default:
        locations = [{ type: "integration", integration: "cal-video" }];
    }

    const calcomInput = {
      title: meetingType.name,
      slug: meetingType.slug,
      lengthInMinutes: meetingType.duration_minutes,
      description: meetingType.description || undefined,
      locations,
      beforeEventBuffer: meetingType.buffer_minutes,
      afterEventBuffer: meetingType.buffer_minutes,
      minimumBookingNotice: meetingType.min_notice_hours * 60, // Convert hours to minutes
      // Convert booking questions to Cal.com booking fields
      bookingFields: convertToCalcomBookingFields(
        meetingType.booking_questions || []
      ),
      // Disable automatic transcription emails (requires paid plan and sends unwanted emails)
      calVideoSettings: {
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      },
    };

    let calEventTypeId = meetingType.cal_event_type_id;

    if (calEventTypeId) {
      // Update existing event type
      console.log("Updating Cal.com event type:", calEventTypeId, calcomInput);
      const updateResult = await updateCalcomEventType(
        meetingType.studio_id,
        calEventTypeId,
        calcomInput
      );
      console.log("Update result:", updateResult);
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
