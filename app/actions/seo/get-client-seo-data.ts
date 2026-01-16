"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireClientUser } from "@/app/_lib/tenancy/guards";
import type { LighthouseScores } from "@/app/_lib/seo/lighthouse";
import type { ClientVisibleMetrics } from "./get-seo-config";
import { z } from "zod";

// ============================================================================
// Schema
// ============================================================================

const GetClientSeoDataSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export type GetClientSeoDataInput = z.infer<typeof GetClientSeoDataSchema>;

// ============================================================================
// Types
// ============================================================================

export interface ClientSeoData {
  domain: string | null;
  isEnabled: boolean;
  visibleMetrics: ClientVisibleMetrics;
  latestAudit: {
    scores: Partial<LighthouseScores>;
    auditedAt: string;
  } | null;
  hasAnyVisibleMetrics: boolean;
}

export type GetClientSeoDataResponse =
  | { ok: true; data: ClientSeoData | null }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Action
// ============================================================================

/**
 * Fetches SEO data for a client user's project.
 * Only returns data allowed by client_visible_metrics settings.
 * Returns null if SEO is not configured or no metrics are visible.
 */
export async function getClientSeoData(
  input: unknown
): Promise<GetClientSeoDataResponse> {
  try {
    // Validate input
    const parseResult = GetClientSeoDataSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: firstError.message,
      };
    }
    const { projectId } = parseResult.data;

    // Get tenant context and verify authorization as client user
    const { context } = await getTenantContext();
    const client = requireClientUser(context);

    // Create Supabase client (uses RLS)
    const supabase = await createClient();

    // Verify project belongs to this client
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("client_id", client.id)
      .single();

    if (projectError || !project) {
      return {
        ok: false,
        errorCode: "NOT_FOUND",
        message: "Project not found",
      };
    }

    // Fetch SEO config
    const { data: config, error: configError } = await supabase
      .from("seo_configs")
      .select("domain, is_enabled, client_visible_metrics")
      .eq("project_id", projectId)
      .maybeSingle();

    if (configError) {
      console.error("Error fetching SEO config:", configError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch SEO data",
      };
    }

    // No config or SEO disabled
    if (!config || !config.is_enabled) {
      return { ok: true, data: null };
    }

    const visibleMetrics = config.client_visible_metrics as ClientVisibleMetrics;

    // Check if any metrics are visible to the client
    const hasAnyVisibleMetrics =
      visibleMetrics.performance ||
      visibleMetrics.seo ||
      visibleMetrics.accessibility ||
      visibleMetrics.bestPractices ||
      visibleMetrics.detailedFindings ||
      visibleMetrics.trendCharts;

    // If no metrics visible, return null (widget should be hidden)
    if (!hasAnyVisibleMetrics) {
      return { ok: true, data: null };
    }

    // Fetch latest audit
    const { data: latestAudit, error: auditError } = await supabase
      .from("seo_audits")
      .select("scores, audited_at")
      .eq("project_id", projectId)
      .eq("audit_type", "lighthouse")
      .order("audited_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (auditError) {
      console.error("Error fetching latest audit:", auditError);
      // Continue without audit data
    }

    // Filter scores based on visibility settings
    let filteredScores: Partial<LighthouseScores> | null = null;
    if (latestAudit) {
      const scores = latestAudit.scores as LighthouseScores;
      filteredScores = {};
      if (visibleMetrics.performance) {
        filteredScores.performance = scores.performance;
      }
      if (visibleMetrics.seo) {
        filteredScores.seo = scores.seo;
      }
      if (visibleMetrics.accessibility) {
        filteredScores.accessibility = scores.accessibility;
      }
      if (visibleMetrics.bestPractices) {
        filteredScores.bestPractices = scores.bestPractices;
      }
    }

    return {
      ok: true,
      data: {
        domain: config.domain,
        isEnabled: config.is_enabled,
        visibleMetrics,
        latestAudit: latestAudit
          ? {
              scores: filteredScores || {},
              auditedAt: latestAudit.audited_at,
            }
          : null,
        hasAnyVisibleMetrics,
      },
    };
  } catch (error) {
    console.error("Error in getClientSeoData:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
