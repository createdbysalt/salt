"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import type { EventStatus, ActionResult } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface UpdateEventStatusInput {
  eventId: string;
  status: EventStatus;
}

export type UpdateEventStatusResponse = ActionResult<{ id: string; status: EventStatus }>;

// ============================================================================
// Action
// ============================================================================

/**
 * Updates the status of an intelligence event.
 * Used for marking as viewed, actioned, dismissed, or archived.
 */
export async function updateEventStatus(
  input: UpdateEventStatusInput
): Promise<UpdateEventStatusResponse> {
  try {
    const { eventId, status } = input;

    // Get tenant context and verify authorization
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);

    const supabase = await createClient();

    // Get current user for dismissed_by field
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        errorCode: "UNAUTHORIZED",
        message: "Authentication required",
      };
    }

    // Build update data based on status
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "dismissed") {
      updateData.dismissed_at = new Date().toISOString();
      updateData.dismissed_by = user.id;
    } else if (status === "archived") {
      updateData.archived_at = new Date().toISOString();
    }

    // Update the event
    const { data: event, error } = await supabase
      .from("intelligence_events")
      .update(updateData)
      .eq("id", eventId)
      .eq("studio_id", studio.id)
      .select("id, status")
      .single();

    if (error) {
      console.error("Error updating event status:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to update event status",
      };
    }

    if (!event) {
      return {
        ok: false,
        errorCode: "NOT_FOUND",
        message: "Event not found",
      };
    }

    revalidatePath("/strategy/intelligence");

    return {
      ok: true,
      data: event as { id: string; status: EventStatus },
    };
  } catch (error) {
    console.error("Error in updateEventStatus:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Dismiss an intelligence event (removes from feed, keeps in history)
 */
export async function dismissEvent(eventId: string): Promise<UpdateEventStatusResponse> {
  return updateEventStatus({ eventId, status: "dismissed" });
}

/**
 * Archive an intelligence event (moves to archive)
 */
export async function archiveEvent(eventId: string): Promise<UpdateEventStatusResponse> {
  return updateEventStatus({ eventId, status: "archived" });
}

/**
 * Mark an intelligence event as viewed
 */
export async function markEventViewed(eventId: string): Promise<UpdateEventStatusResponse> {
  return updateEventStatus({ eventId, status: "viewed" });
}

/**
 * Mark an intelligence event as actioned
 */
export async function markEventActioned(eventId: string): Promise<UpdateEventStatusResponse> {
  return updateEventStatus({ eventId, status: "actioned" });
}
