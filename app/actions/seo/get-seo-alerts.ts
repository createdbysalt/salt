"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { z } from "zod";
import type { SeoAlert, ScoreDropMetadata } from "./run-audit";

// ============================================================================
// Schema
// ============================================================================

const GetSeoAlertsSchema = z.object({
  projectId: z.string().uuid("Invalid project ID").optional(),
  includeDismissed: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).optional().default(50),
});

export type GetSeoAlertsInput = z.infer<typeof GetSeoAlertsSchema>;

// ============================================================================
// Types
// ============================================================================

export interface SeoAlertWithProject extends SeoAlert {
  projectName: string;
}

export interface GetSeoAlertsData {
  alerts: SeoAlertWithProject[];
  totalCount: number;
}

export type GetSeoAlertsResponse =
  | { ok: true; data: GetSeoAlertsData }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Action
// ============================================================================

/**
 * Fetches SEO alerts for the studio.
 * Can be filtered by projectId and dismissed status.
 */
export async function getSeoAlerts(
  input: unknown = {}
): Promise<GetSeoAlertsResponse> {
  try {
    // Validate input
    const parseResult = GetSeoAlertsSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: firstError.message,
      };
    }
    const { projectId, includeDismissed, limit } = parseResult.data;

    // Get tenant context and verify authorization
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);

    // Create Supabase client (uses RLS)
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("seo_alerts")
      .select(
        `
        id,
        project_id,
        studio_id,
        alert_type,
        message,
        metadata,
        is_dismissed,
        created_at,
        projects!inner (
          name
        )
      `,
        { count: "exact" }
      )
      .eq("studio_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by project if specified
    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    // Filter out dismissed unless explicitly included
    if (!includeDismissed) {
      query = query.eq("is_dismissed", false);
    }

    const { data: alerts, error, count } = await query;

    if (error) {
      console.error("Error fetching SEO alerts:", error);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch alerts",
      };
    }

    // Map to typed response
    const mappedAlerts: SeoAlertWithProject[] = (alerts || []).map((alert) => ({
      id: alert.id,
      projectId: alert.project_id,
      studioId: alert.studio_id,
      alertType: alert.alert_type as SeoAlert["alertType"],
      message: alert.message,
      metadata: alert.metadata as ScoreDropMetadata,
      isDismissed: alert.is_dismissed,
      createdAt: alert.created_at,
      projectName: (alert.projects as unknown as { name: string }).name,
    }));

    return {
      ok: true,
      data: {
        alerts: mappedAlerts,
        totalCount: count ?? mappedAlerts.length,
      },
    };
  } catch (error) {
    console.error("Error in getSeoAlerts:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Gets the total count of undismissed alerts for the studio.
 * Used for nav badge display.
 */
export async function getSeoAlertCount(): Promise<number> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);

    const supabase = await createClient();

    const { count, error } = await supabase
      .from("seo_alerts")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", workspace.id)
      .eq("is_dismissed", false);

    if (error) {
      console.error("Error fetching SEO alert count:", error);
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}
