"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { runLighthouseAudit, isLighthouseError } from "@/app/_lib/seo/lighthouse";
import type { LighthouseScores } from "@/app/_lib/seo/lighthouse";
import { getCoreWebVitals, isCruxError } from "@/app/_lib/seo/crux";
import type { CoreWebVitals } from "@/app/_lib/seo/crux";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// Alert Types
// ============================================================================

export interface SeoAlert {
  id: string;
  projectId: string;
  studioId: string;
  alertType: "score_drop" | "critical_score" | "audit_failed";
  message: string;
  metadata: ScoreDropMetadata;
  isDismissed: boolean;
  createdAt: string;
}

export interface ScoreDropMetadata {
  category: keyof LighthouseScores;
  categoryLabel: string;
  oldScore: number;
  newScore: number;
  dropAmount: number;
}

// Threshold for creating alerts (any score drop > 10 points)
const SCORE_DROP_THRESHOLD = 10;

// ============================================================================
// Schema
// ============================================================================

const RunAuditSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export type RunAuditInput = z.infer<typeof RunAuditSchema>;

// ============================================================================
// Types
// ============================================================================

export interface SeoAudit {
  id: string;
  projectId: string;
  studioId: string;
  auditType: "lighthouse" | "crux";
  scores: LighthouseScores;
  auditedAt: string;
  createdAt: string;
}

export interface RunAuditResult {
  lighthouse: SeoAudit;
  crux: CoreWebVitals | null; // null when domain has insufficient traffic
  alerts: SeoAlert[]; // alerts created due to score drops
}

export type RunAuditResponse =
  | { ok: true; data: RunAuditResult }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Action
// ============================================================================

/**
 * Triggers a Lighthouse audit for a project and stores the results.
 * Requires SEO to be configured with a domain for the project.
 */
export async function runAudit(
  input: unknown
): Promise<RunAuditResponse> {
  try {
    // Validate input
    const parseResult = RunAuditSchema.safeParse(input);
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

    // Get SEO config for domain
    const { data: seoConfig, error: configError } = await supabase
      .from("seo_configs")
      .select("domain, is_enabled")
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

    if (!seoConfig) {
      return {
        ok: false,
        errorCode: "NOT_CONFIGURED",
        message: "SEO is not configured for this project. Please add a domain first.",
      };
    }

    if (!seoConfig.domain) {
      return {
        ok: false,
        errorCode: "NO_DOMAIN",
        message: "No domain configured for this project. Please add a domain in SEO settings.",
      };
    }

    if (!seoConfig.is_enabled) {
      return {
        ok: false,
        errorCode: "SEO_DISABLED",
        message: "SEO tracking is disabled for this project. Enable it in settings to run audits.",
      };
    }

    // Fetch the previous Lighthouse audit (for score comparison)
    const { data: previousAudit } = await supabase
      .from("seo_audits")
      .select("scores")
      .eq("project_id", projectId)
      .eq("audit_type", "lighthouse")
      .order("audited_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousScores = previousAudit?.scores as LighthouseScores | null;

    // Run Lighthouse and CrUX audits in parallel
    const [lighthouseResult, cruxResult] = await Promise.all([
      runLighthouseAudit(seoConfig.domain),
      getCoreWebVitals(seoConfig.domain),
    ]);

    if (isLighthouseError(lighthouseResult)) {
      return {
        ok: false,
        errorCode: lighthouseResult.code,
        message: lighthouseResult.message,
      };
    }

    // Store Lighthouse audit results
    const { data: audit, error: insertError } = await supabase
      .from("seo_audits")
      .insert({
        project_id: projectId,
        studio_id: workspace.id, // Required for RLS, trigger will verify
        audit_type: "lighthouse",
        scores: lighthouseResult.scores,
        raw_data: lighthouseResult.rawData,
        audited_at: lighthouseResult.fetchedAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing Lighthouse audit results:", insertError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to store audit results",
      };
    }

    // Handle CrUX data - store if available, log errors but don't fail the audit
    let cruxData: CoreWebVitals | null = null;

    if (isCruxError(cruxResult)) {
      // Log CrUX error but continue - Lighthouse audit was successful
      console.warn("CrUX API error (non-fatal):", cruxResult.message);
    } else if (cruxResult !== null) {
      // CrUX data available - store it
      cruxData = cruxResult;

      const { error: cruxInsertError } = await supabase
        .from("seo_audits")
        .insert({
          project_id: projectId,
          studio_id: workspace.id,
          audit_type: "crux",
          scores: {
            lcp: cruxResult.lcp.value,
            inp: cruxResult.inp.value,
            cls: cruxResult.cls.value,
          },
          raw_data: cruxResult,
          audited_at: cruxResult.fetchedAt,
        });

      if (cruxInsertError) {
        console.warn("Error storing CrUX results (non-fatal):", cruxInsertError);
      }
    }
    // If cruxResult is null, domain has insufficient traffic - that's fine

    // ========================================================================
    // Score Drop Alerts
    // ========================================================================
    // Compare with previous scores and create alerts for significant drops

    const createdAlerts: SeoAlert[] = [];

    if (previousScores) {
      const categoryLabels: Record<keyof LighthouseScores, string> = {
        performance: "Performance",
        accessibility: "Accessibility",
        bestPractices: "Best Practices",
        seo: "SEO",
      };

      const categories: (keyof LighthouseScores)[] = [
        "performance",
        "accessibility",
        "bestPractices",
        "seo",
      ];

      for (const category of categories) {
        const oldScore = previousScores[category];
        const newScore = lighthouseResult.scores[category];
        const dropAmount = oldScore - newScore;

        if (dropAmount > SCORE_DROP_THRESHOLD) {
          const categoryLabel = categoryLabels[category];
          const message = `${categoryLabel} score dropped from ${oldScore} to ${newScore} (-${dropAmount} points)`;

          const metadata: ScoreDropMetadata = {
            category,
            categoryLabel,
            oldScore,
            newScore,
            dropAmount,
          };

          // Insert the alert
          const { data: alert, error: alertError } = await supabase
            .from("seo_alerts")
            .insert({
              project_id: projectId,
              studio_id: workspace.id,
              alert_type: "score_drop",
              message,
              metadata,
            })
            .select()
            .single();

          if (alertError) {
            console.warn("Error creating score drop alert (non-fatal):", alertError);
          } else if (alert) {
            createdAlerts.push({
              id: alert.id,
              projectId: alert.project_id,
              studioId: alert.studio_id,
              alertType: alert.alert_type as "score_drop",
              message: alert.message,
              metadata: alert.metadata as ScoreDropMetadata,
              isDismissed: alert.is_dismissed,
              createdAt: alert.created_at,
            });
          }
        }
      }
    }

    // Revalidate relevant paths
    revalidatePath("/work");
    revalidatePath("/strategy/seo");

    // Map to camelCase response
    const seoAudit: SeoAudit = {
      id: audit.id,
      projectId: audit.project_id,
      studioId: audit.studio_id,
      auditType: audit.audit_type as "lighthouse" | "crux",
      scores: audit.scores as LighthouseScores,
      auditedAt: audit.audited_at,
      createdAt: audit.created_at,
    };

    return {
      ok: true,
      data: {
        lighthouse: seoAudit,
        crux: cruxData,
        alerts: createdAlerts,
      },
    };
  } catch (error) {
    console.error("Error in runAudit:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
