"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type {
  IntelligenceEventWithRelations,
  FeedFilters,
  ActionResult,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface GetIntelligenceFeedInput {
  filters?: FeedFilters;
  limit?: number;
  offset?: number;
}

export interface GetIntelligenceFeedData {
  events: IntelligenceEventWithRelations[];
  total: number;
  hasMore: boolean;
}

export type GetIntelligenceFeedResponse = ActionResult<GetIntelligenceFeedData>;

// ============================================================================
// Helper Functions
// ============================================================================

function getTimeRangeFilter(timeRange: FeedFilters["timeRange"]): Date | null {
  if (!timeRange || timeRange === "realtime") return null;

  const now = new Date();
  switch (timeRange) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

// ============================================================================
// Action
// ============================================================================

/**
 * Fetches intelligence feed for the current studio.
 * Returns events sorted by creation date (newest first) with optional filters.
 */
export async function getIntelligenceFeed(
  input: GetIntelligenceFeedInput = {}
): Promise<GetIntelligenceFeedResponse> {
  try {
    const { filters = {}, limit = 50, offset = 0 } = input;

    // Get tenant context and verify authorization
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);

    const supabase = await createClient();

    // Build query
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
      .eq("studio_id", studio.id)
      .not("status", "in", "(dismissed,archived)")
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters.type && filters.type !== "all") {
      query = query.eq("event_type", filters.type);
    }

    if (filters.urgency && filters.urgency !== "all") {
      query = query.eq("urgency", filters.urgency);
    }

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.project_id) {
      query = query.eq("project_id", filters.project_id);
    }

    if (filters.client_id) {
      query = query.eq("client_id", filters.client_id);
    }

    // Time range filter
    const timeRangeDate = getTimeRangeFilter(filters.timeRange);
    if (timeRangeDate) {
      query = query.gte("created_at", timeRangeDate.toISOString());
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error("Error fetching intelligence feed:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch intelligence feed",
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
    console.error("Error in getIntelligenceFeed:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
