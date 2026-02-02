"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ClientVisibleMetrics, SeoConfig } from "./get-seo-config";

// ============================================================================
// Schema
// ============================================================================

const ClientVisibleMetricsSchema = z.object({
  performance: z.boolean(),
  seo: z.boolean(),
  accessibility: z.boolean(),
  bestPractices: z.boolean(),
  detailedFindings: z.boolean(),
  trendCharts: z.boolean(),
});

const UpdateSeoConfigSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  domain: z.string().url("Invalid URL format").nullable().optional(),
  isEnabled: z.boolean().optional(),
  clientVisibleMetrics: ClientVisibleMetricsSchema.optional(),
});

export type UpdateSeoConfigInput = z.infer<typeof UpdateSeoConfigSchema>;

export type UpdateSeoConfigResponse =
  | { ok: true; data: SeoConfig }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Action
// ============================================================================

/**
 * Creates or updates SEO configuration for a project.
 * If no config exists, creates one. Otherwise updates existing.
 */
export async function updateSeoConfig(
  input: unknown
): Promise<UpdateSeoConfigResponse> {
  try {
    // Validate input
    const parseResult = UpdateSeoConfigSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return {
        ok: false,
        errorCode: "VALIDATION_ERROR",
        message: firstError.message,
      };
    }
    const { projectId, domain, isEnabled, clientVisibleMetrics } = parseResult.data;

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

    // Check if config already exists
    const { data: existingConfig } = await supabase
      .from("seo_configs")
      .select("id")
      .eq("project_id", projectId)
      .maybeSingle();

    // Build update data (only include fields that were provided)
    const updateData: Record<string, unknown> = {};
    if (domain !== undefined) updateData.domain = domain;
    if (isEnabled !== undefined) updateData.is_enabled = isEnabled;
    if (clientVisibleMetrics !== undefined) updateData.client_visible_metrics = clientVisibleMetrics;

    let config;

    if (existingConfig) {
      // Update existing config
      const { data, error } = await supabase
        .from("seo_configs")
        .update(updateData)
        .eq("id", existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating SEO config:", error);
        return {
          ok: false,
          errorCode: "DATABASE_ERROR",
          message: "Failed to update SEO configuration",
        };
      }

      config = data;
    } else {
      // Create new config
      // Note: studio_id is set automatically by trigger from project_id
      const insertData = {
        project_id: projectId,
        studio_id: studio.id, // Required for RLS, trigger will verify
        domain: domain ?? null,
        is_enabled: isEnabled ?? false,
        client_visible_metrics: clientVisibleMetrics ?? {
          performance: true,
          seo: true,
          accessibility: true,
          bestPractices: true,
          detailedFindings: false,
          trendCharts: true,
        },
      };

      const { data, error } = await supabase
        .from("seo_configs")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error creating SEO config:", error);
        return {
          ok: false,
          errorCode: "DATABASE_ERROR",
          message: "Failed to create SEO configuration",
        };
      }

      config = data;
    }

    // Revalidate relevant paths
    revalidatePath(`/studio/projects/${projectId}/settings`);
    revalidatePath(`/studio/projects/${projectId}/seo`);
    revalidatePath("/strategy/seo");

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
    console.error("Error in updateSeoConfig:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
