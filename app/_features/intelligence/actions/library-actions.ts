"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import type {
  IntelligenceEventWithRelations,
  LibraryFilters,
  ActionResult,
} from "./types";

// ============================================================================
// Save to Library
// ============================================================================

export interface SaveToLibraryInput {
  eventId: string;
  tags?: string[];
}

export type SaveToLibraryResponse = ActionResult<{ id: string; is_saved: boolean }>;

/**
 * Saves an intelligence event to the library for future reference.
 */
export async function saveToLibrary(
  input: SaveToLibraryInput
): Promise<SaveToLibraryResponse> {
  try {
    const { eventId, tags = [] } = input;

    const { context } = await getTenantContext();
    const studio = requireWorkspaceMember(context);

    const supabase = await createClient();

    const { data: event, error } = await supabase
      .from("intelligence_events")
      .update({
        is_saved: true,
        saved_at: new Date().toISOString(),
        tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .eq("workspace_id", studio.id)
      .select("id, is_saved")
      .single();

    if (error) {
      console.error("Error saving to library:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to save to library",
      };
    }

    revalidatePath("/strategy/intelligence");

    return {
      ok: true,
      data: event as { id: string; is_saved: boolean },
    };
  } catch (error) {
    console.error("Error in saveToLibrary:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// Remove from Library
// ============================================================================

export type RemoveFromLibraryResponse = ActionResult<{ id: string; is_saved: boolean }>;

/**
 * Removes an intelligence event from the library.
 */
export async function removeFromLibrary(
  eventId: string
): Promise<RemoveFromLibraryResponse> {
  try {
    const { context } = await getTenantContext();
    const studio = requireWorkspaceMember(context);

    const supabase = await createClient();

    const { data: event, error } = await supabase
      .from("intelligence_events")
      .update({
        is_saved: false,
        saved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .eq("workspace_id", studio.id)
      .select("id, is_saved")
      .single();

    if (error) {
      console.error("Error removing from library:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to remove from library",
      };
    }

    revalidatePath("/strategy/intelligence");

    return {
      ok: true,
      data: event as { id: string; is_saved: boolean },
    };
  } catch (error) {
    console.error("Error in removeFromLibrary:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// Get Saved Intelligence
// ============================================================================

export interface GetSavedIntelligenceInput {
  filters?: LibraryFilters;
  limit?: number;
  offset?: number;
}

export interface GetSavedIntelligenceData {
  events: IntelligenceEventWithRelations[];
  total: number;
  hasMore: boolean;
}

export type GetSavedIntelligenceResponse = ActionResult<GetSavedIntelligenceData>;

/**
 * Fetches saved intelligence events (library) with optional search/filters.
 */
export async function getSavedIntelligence(
  input: GetSavedIntelligenceInput = {}
): Promise<GetSavedIntelligenceResponse> {
  try {
    const { filters = {}, limit = 50, offset = 0 } = input;

    const { context } = await getTenantContext();
    const studio = requireWorkspaceMember(context);

    const supabase = await createClient();

    let query = supabase
      .from("intelligence_events")
      .select(
        `
        *,
        project:projects(id, name),
        client:clients(id, name)
      `,
        { count: "exact" }
      )
      .eq("workspace_id", studio.id)
      .eq("is_saved", true)
      .order("saved_at", { ascending: false });

    // Apply filters
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`
      );
    }

    if (filters.type && filters.type !== "all") {
      query = query.eq("event_type", filters.type);
    }

    if (filters.project_id) {
      query = query.eq("project_id", filters.project_id);
    }

    if (filters.client_id) {
      query = query.eq("client_id", filters.client_id);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps("tags", filters.tags);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error("Error fetching saved intelligence:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch saved intelligence",
      };
    }

    const total = count ?? 0;

    return {
      ok: true,
      data: {
        events: (events ?? []) as IntelligenceEventWithRelations[],
        total,
        hasMore: offset + (events?.length ?? 0) < total,
      },
    };
  } catch (error) {
    console.error("Error in getSavedIntelligence:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// Update Event Tags
// ============================================================================

export interface UpdateEventTagsInput {
  eventId: string;
  tags: string[];
}

export type UpdateEventTagsResponse = ActionResult<{ id: string; tags: string[] }>;

/**
 * Updates the tags on an intelligence event.
 */
export async function updateEventTags(
  input: UpdateEventTagsInput
): Promise<UpdateEventTagsResponse> {
  try {
    const { eventId, tags } = input;

    const { context } = await getTenantContext();
    const studio = requireWorkspaceMember(context);

    const supabase = await createClient();

    const { data: event, error } = await supabase
      .from("intelligence_events")
      .update({
        tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .eq("workspace_id", studio.id)
      .select("id, tags")
      .single();

    if (error) {
      console.error("Error updating event tags:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to update event tags",
      };
    }

    revalidatePath("/strategy/intelligence");

    return {
      ok: true,
      data: event as { id: string; tags: string[] },
    };
  } catch (error) {
    console.error("Error in updateEventTags:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// Get All Tags
// ============================================================================

export type GetAllTagsResponse = ActionResult<string[]>;

/**
 * Gets all unique tags used in the studio's intelligence events.
 */
export async function getAllTags(): Promise<GetAllTagsResponse> {
  try {
    const { context } = await getTenantContext();
    const studio = requireWorkspaceMember(context);

    const supabase = await createClient();

    // Fetch all tags arrays and flatten/dedupe
    const { data, error } = await supabase
      .from("intelligence_events")
      .select("tags")
      .eq("workspace_id", studio.id)
      .not("tags", "eq", "{}");

    if (error) {
      console.error("Error fetching tags:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch tags",
      };
    }

    // Flatten and deduplicate tags
    const allTags = (data ?? [])
      .flatMap((row) => row.tags ?? [])
      .filter((tag, index, self) => self.indexOf(tag) === index)
      .sort();

    return {
      ok: true,
      data: allTags,
    };
  } catch (error) {
    console.error("Error in getAllTags:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
