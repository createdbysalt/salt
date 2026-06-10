"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { z } from "zod";

// ============================================================================
// Schema
// ============================================================================

const GetSeoConfigSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export type GetSeoConfigInput = z.infer<typeof GetSeoConfigSchema>;

// ============================================================================
// Types
// ============================================================================

export interface ClientVisibleMetrics {
  performance: boolean;
  seo: boolean;
  accessibility: boolean;
  bestPractices: boolean;
  detailedFindings: boolean;
  trendCharts: boolean;
}

export interface SeoConfig {
  id: string;
  projectId: string;
  studioId: string;
  domain: string | null;
  isEnabled: boolean;
  clientVisibleMetrics: ClientVisibleMetrics;
  createdAt: string;
  updatedAt: string;
}

export type GetSeoConfigResponse =
  | { ok: true; data: SeoConfig | null }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Action
// ============================================================================

/**
 * Fetches SEO configuration for a project.
 * Returns null if no config exists.
 */
export async function getSeoConfig(
  input: unknown
): Promise<GetSeoConfigResponse> {
  try {
    // Validate input
    const parseResult = GetSeoConfigSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: firstError.message,
      };
    }
    const { projectId } = parseResult.data;

    // Get tenant context and verify authorization
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);

    // Create Supabase client (uses RLS)
    const supabase = await createClient();

    // Verify project belongs to this workspace
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("studio_id", workspace.id)
      .single();

    if (projectError || !project) {
      return {
        ok: false,
        errorCode: "NOT_FOUND",
        message: "Project not found",
      };
    }

    // Fetch SEO config (may not exist)
    const { data: config, error: configError } = await supabase
      .from("seo_configs")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (configError) {
      console.error("Error fetching SEO config:", configError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch SEO configuration",
      };
    }

    // Return null if no config exists
    if (!config) {
      return { ok: true, data: null };
    }

    // Map to camelCase response
    const seoConfig: SeoConfig = {
      id: config.id,
      projectId: config.project_id,
      studioId: config.studio_id,
      domain: config.domain,
      isEnabled: config.is_enabled,
      clientVisibleMetrics: config.client_visible_metrics as ClientVisibleMetrics,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    };

    return { ok: true, data: seoConfig };
  } catch (error) {
    console.error("Error in getSeoConfig:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
