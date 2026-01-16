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

const GetClientSeoDetailSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export type GetClientSeoDetailInput = z.infer<typeof GetClientSeoDetailSchema>;

// ============================================================================
// Types
// ============================================================================

export interface ClientAuditRecord {
  /** Filtered scores based on visibility settings */
  scores: Partial<LighthouseScores>;
  /** When the audit was performed */
  auditedAt: string;
  /** Raw data for detailed findings (only if detailedFindings is enabled) */
  rawData?: Record<string, unknown>;
}

export interface ClientSeoDetail {
  domain: string | null;
  isEnabled: boolean;
  visibleMetrics: ClientVisibleMetrics;
  /** Latest audit (for score display) */
  latestAudit: ClientAuditRecord | null;
  /** Audit history for trends chart (only if trendCharts is enabled) */
  auditHistory: ClientAuditRecord[];
  hasAnyVisibleMetrics: boolean;
  /** Whether the client can view detailed content (detailedFindings or trendCharts) */
  hasDetailedAccess: boolean;
}

export type GetClientSeoDetailResponse =
  | { ok: true; data: ClientSeoDetail | null }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Action
// ============================================================================

/**
 * Fetches extended SEO data for a client user's project.
 * Returns audit history for trends and raw data for detailed findings.
 * Only returns data allowed by client_visible_metrics settings.
 * Returns null if SEO is not configured or no metrics are visible.
 */
export async function getClientSeoDetail(
  input: unknown
): Promise<GetClientSeoDetailResponse> {
  try {
    // Validate input
    const parseResult = GetClientSeoDetailSchema.safeParse(input);
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

    // If no metrics visible, return null (page should redirect)
    if (!hasAnyVisibleMetrics) {
      return { ok: true, data: null };
    }

    const hasDetailedAccess =
      visibleMetrics.detailedFindings || visibleMetrics.trendCharts;

    // Determine how much data to fetch
    const includeRawData = visibleMetrics.detailedFindings;
    const fetchHistory = visibleMetrics.trendCharts;
    const auditLimit = fetchHistory ? 100 : 1;

    // Filter scores based on visibility settings
    function filterScores(scores: LighthouseScores): Partial<LighthouseScores> {
      const filtered: Partial<LighthouseScores> = {};
      if (visibleMetrics.performance) {
        filtered.performance = scores.performance;
      }
      if (visibleMetrics.seo) {
        filtered.seo = scores.seo;
      }
      if (visibleMetrics.accessibility) {
        filtered.accessibility = scores.accessibility;
      }
      if (visibleMetrics.bestPractices) {
        filtered.bestPractices = scores.bestPractices;
      }
      return filtered;
    }

    // Fetch audits - use separate query paths for TypeScript literal string requirement
    let audits: Array<{
      id: string;
      scores: unknown;
      audited_at: string;
      raw_data?: unknown;
    }> | null = null;
    let auditsError: Error | null = null;

    if (includeRawData) {
      const result = await supabase
        .from("seo_audits")
        .select("id, scores, audited_at, raw_data")
        .eq("project_id", projectId)
        .eq("audit_type", "lighthouse")
        .order("audited_at", { ascending: false })
        .limit(auditLimit);

      audits = result.data;
      auditsError = result.error;
    } else {
      const result = await supabase
        .from("seo_audits")
        .select("id, scores, audited_at")
        .eq("project_id", projectId)
        .eq("audit_type", "lighthouse")
        .order("audited_at", { ascending: false })
        .limit(auditLimit);

      audits = result.data;
      auditsError = result.error;
    }

    if (auditsError) {
      console.error("Error fetching audits:", auditsError);
      // Continue without audit data
    }

    // Process audit records
    const processedAudits: ClientAuditRecord[] = (audits || []).map((audit) => {
      const record: ClientAuditRecord = {
        scores: filterScores(audit.scores as LighthouseScores),
        auditedAt: audit.audited_at,
      };
      // Only include raw data if detailed findings is enabled
      if (includeRawData && audit.raw_data) {
        record.rawData = audit.raw_data as Record<string, unknown>;
      }
      return record;
    });

    const latestAudit = processedAudits.length > 0 ? processedAudits[0] : null;

    // For trends, we need full LighthouseScores objects
    // Only include audits that have all visible score categories
    const auditHistory = fetchHistory ? processedAudits : [];

    return {
      ok: true,
      data: {
        domain: config.domain,
        isEnabled: config.is_enabled,
        visibleMetrics,
        latestAudit,
        auditHistory,
        hasAnyVisibleMetrics,
        hasDetailedAccess,
      },
    };
  } catch (error) {
    console.error("Error in getClientSeoDetail:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
