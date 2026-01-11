"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import type { LighthouseScores } from "@/libs/seo/lighthouse";

// ============================================================================
// Types
// ============================================================================

export interface ProjectWithSeoData {
  id: string;
  name: string;
  domain: string | null;
  isEnabled: boolean;
  latestAudit: {
    scores: LighthouseScores;
    auditedAt: string;
  } | null;
  status: "healthy" | "needs-attention" | "critical" | "no-data";
  alertCount: number;
}

export interface SeoOverviewData {
  projects: ProjectWithSeoData[];
  summary: {
    totalTracked: number;
    averagePerformance: number | null;
    averageSeo: number | null;
    projectsNeedingAttention: number;
    projectsCritical: number;
    totalAlerts: number;
  };
}

export type GetSeoOverviewResponse =
  | { ok: true; data: SeoOverviewData }
  | { ok: false; errorCode: string; message: string };

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine project SEO status based on scores
 * - healthy: all scores >= 90
 * - needs-attention: any score 50-89
 * - critical: any score < 50
 * - no-data: no audit data
 */
function getProjectStatus(scores: LighthouseScores | null): ProjectWithSeoData["status"] {
  if (!scores) return "no-data";

  const allScores = [
    scores.performance,
    scores.seo,
    scores.accessibility,
    scores.bestPractices,
  ];

  // Check for critical (any score < 50)
  if (allScores.some((s) => s < 50)) {
    return "critical";
  }

  // Check for needs attention (any score 50-89)
  if (allScores.some((s) => s < 90)) {
    return "needs-attention";
  }

  // All scores >= 90
  return "healthy";
}

// ============================================================================
// Action
// ============================================================================

/**
 * Fetches SEO overview data for all projects in the studio.
 * Returns projects with their latest audit scores and status.
 */
export async function getSeoOverview(): Promise<GetSeoOverviewResponse> {
  try {
    // Get tenant context and verify authorization
    const { context } = await getTenantContext();
    const studio = requireStudioMember(context);

    // Create Supabase client (uses RLS)
    const supabase = await createClient();

    // Fetch all projects with SEO configs for this studio
    const { data: projectsWithConfigs, error: projectsError } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        seo_configs (
          id,
          domain,
          is_enabled
        )
      `)
      .eq("studio_id", studio.id)
      .order("name", { ascending: true });

    if (projectsError) {
      console.error("Error fetching projects with SEO configs:", projectsError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch projects",
      };
    }

    // Filter to only projects with SEO configs
    const seoProjects = (projectsWithConfigs || []).filter(
      (p) => p.seo_configs && Array.isArray(p.seo_configs) && p.seo_configs.length > 0
    );

    if (seoProjects.length === 0) {
      return {
        ok: true,
        data: {
          projects: [],
          summary: {
            totalTracked: 0,
            averagePerformance: null,
            averageSeo: null,
            projectsNeedingAttention: 0,
            projectsCritical: 0,
            totalAlerts: 0,
          },
        },
      };
    }

    // Get project IDs for batch audit fetch
    const projectIds = seoProjects.map((p) => p.id);

    // Fetch latest audit for each project using a window function approach
    // We need the most recent lighthouse audit per project
    const { data: latestAudits, error: auditsError } = await supabase
      .from("seo_audits")
      .select("project_id, scores, audited_at")
      .in("project_id", projectIds)
      .eq("audit_type", "lighthouse")
      .order("audited_at", { ascending: false });

    if (auditsError) {
      console.error("Error fetching latest audits:", auditsError);
      return {
        ok: false,
        errorCode: "DATABASE_ERROR",
        message: "Failed to fetch audit data",
      };
    }

    // Group audits by project and get the latest one for each
    const auditsByProject = new Map<string, { scores: LighthouseScores; auditedAt: string }>();
    for (const audit of latestAudits || []) {
      if (!auditsByProject.has(audit.project_id)) {
        auditsByProject.set(audit.project_id, {
          scores: audit.scores as LighthouseScores,
          auditedAt: audit.audited_at,
        });
      }
    }

    // Fetch undismissed alerts count per project
    const { data: alertCounts } = await supabase
      .from("seo_alerts")
      .select("project_id")
      .in("project_id", projectIds)
      .eq("is_dismissed", false);

    // Count alerts per project
    const alertsByProject = new Map<string, number>();
    for (const alert of alertCounts || []) {
      const count = alertsByProject.get(alert.project_id) || 0;
      alertsByProject.set(alert.project_id, count + 1);
    }

    // Build project data
    const projects: ProjectWithSeoData[] = seoProjects.map((project) => {
      const config = Array.isArray(project.seo_configs) ? project.seo_configs[0] : null;
      const latestAudit = auditsByProject.get(project.id) || null;
      const scores = latestAudit?.scores || null;

      return {
        id: project.id,
        name: project.name,
        domain: config?.domain || null,
        isEnabled: config?.is_enabled ?? false,
        latestAudit,
        status: getProjectStatus(scores),
        alertCount: alertsByProject.get(project.id) || 0,
      };
    });

    // Calculate summary statistics
    const enabledProjects = projects.filter((p) => p.isEnabled);
    const projectsWithScores = enabledProjects.filter((p) => p.latestAudit?.scores);

    let averagePerformance: number | null = null;
    let averageSeo: number | null = null;

    if (projectsWithScores.length > 0) {
      const performanceSum = projectsWithScores.reduce(
        (sum, p) => sum + (p.latestAudit?.scores.performance || 0),
        0
      );
      const seoSum = projectsWithScores.reduce(
        (sum, p) => sum + (p.latestAudit?.scores.seo || 0),
        0
      );
      averagePerformance = Math.round(performanceSum / projectsWithScores.length);
      averageSeo = Math.round(seoSum / projectsWithScores.length);
    }

    // Calculate total alerts across all projects
    const totalAlerts = projects.reduce((sum, p) => sum + p.alertCount, 0);

    const summary = {
      totalTracked: enabledProjects.length,
      averagePerformance,
      averageSeo,
      projectsNeedingAttention: projects.filter((p) => p.status === "needs-attention").length,
      projectsCritical: projects.filter((p) => p.status === "critical").length,
      totalAlerts,
    };

    return {
      ok: true,
      data: {
        projects,
        summary,
      },
    };
  } catch (error) {
    console.error("Error in getSeoOverview:", error);
    return {
      ok: false,
      errorCode: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
