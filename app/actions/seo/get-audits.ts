"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import type { LighthouseScores } from "@/libs/seo/lighthouse";
import { z } from "zod";

// ============================================================================
// Schema
// ============================================================================

const GetAuditsSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  auditType: z.enum(["lighthouse", "crux"]).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  includeRawData: z.boolean().optional().default(false),
});

export type GetAuditsInput = z.infer<typeof GetAuditsSchema>;

// ============================================================================
// Types
// ============================================================================

export interface SeoAuditRecord {
  id: string;
  projectId: string;
  studioId: string;
  auditType: "lighthouse" | "crux";
  scores: LighthouseScores;
  rawData?: Record<string, unknown>;
  auditedAt: string;
  createdAt: string;
}

export interface GetAuditsData {
  audits: SeoAuditRecord[];
  total: number;
  hasMore: boolean;
}

export type GetAuditsResponse =
  | { ok: true; data: GetAuditsData }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Action
// ============================================================================

/**
 * Fetches audit history for a project.
 * Returns audits ordered by audited_at DESC (most recent first).
 */
export async function getAudits(
  input: unknown
): Promise<GetAuditsResponse> {
  try {
    // Validate input
    const parseResult = GetAuditsSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: firstError.message,
      };
    }
    const { projectId, auditType, limit, offset, includeRawData } = parseResult.data;

    // Get tenant context and verify authorization
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);

    // Create Supabase client (uses RLS)
    const supabase = await createClient();

    // Verify project belongs to this studio
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("studio_id", studio.id)
      .single();

    if (projectError || !project) {
      return {
        ok: false,
        errorCode: "NOT_FOUND",
        message: "Project not found",
      };
    }

    // Build query - use separate paths to satisfy TypeScript's literal type requirement
    let audits: Array<{
      id: string;
      project_id: string;
      studio_id: string;
      audit_type: string;
      scores: unknown;
      raw_data?: unknown;
      audited_at: string;
      created_at: string;
    }> | null = null;
    let auditsError: Error | null = null;
    let count: number | null = null;

    if (includeRawData) {
      let query = supabase
        .from("seo_audits")
        .select("id, project_id, studio_id, audit_type, scores, raw_data, audited_at, created_at", {
          count: "exact",
        })
        .eq("project_id", projectId)
        .order("audited_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (auditType) {
        query = query.eq("audit_type", auditType);
      }

      const result = await query;
      audits = result.data;
      auditsError = result.error;
      count = result.count;
    } else {
      let query = supabase
        .from("seo_audits")
        .select("id, project_id, studio_id, audit_type, scores, audited_at, created_at", {
          count: "exact",
        })
        .eq("project_id", projectId)
        .order("audited_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (auditType) {
        query = query.eq("audit_type", auditType);
      }

      const result = await query;
      audits = result.data;
      auditsError = result.error;
      count = result.count;
    }

    if (auditsError) {
      console.error("Error fetching audits:", auditsError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch audit history",
      };
    }

    // Map to camelCase response
    const auditRecords: SeoAuditRecord[] = (audits || []).map((audit) => {
      const record: SeoAuditRecord = {
        id: audit.id,
        projectId: audit.project_id,
        studioId: audit.studio_id,
        auditType: audit.audit_type as "lighthouse" | "crux",
        scores: audit.scores as LighthouseScores,
        auditedAt: audit.audited_at,
        createdAt: audit.created_at,
      };
      // Include raw_data if it was requested and present
      if (includeRawData && audit.raw_data) {
        record.rawData = audit.raw_data as Record<string, unknown>;
      }
      return record;
    });

    const total = count ?? 0;
    const hasMore = offset + (audits?.length ?? 0) < total;

    return {
      ok: true,
      data: {
        audits: auditRecords,
        total,
        hasMore,
      },
    };
  } catch (error) {
    console.error("Error in getAudits:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
