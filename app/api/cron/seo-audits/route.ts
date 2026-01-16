/**
 * SEO Audits Cron Endpoint
 *
 * Runs scheduled Lighthouse audits for projects with stale SEO data (>7 days).
 * Secured with CRON_SECRET header validation.
 *
 * Usage:
 * - Call with Authorization: Bearer <CRON_SECRET> header
 * - Max 10 audits per run to respect API rate limits
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { runLighthouseAudit, isLighthouseError } from "@/app/_lib/seo/lighthouse";
import { getCoreWebVitals, isCruxError } from "@/app/_lib/seo/crux";
import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;
const MAX_AUDITS_PER_RUN = 10;
const STALE_THRESHOLD_DAYS = 7;

interface AuditResult {
  projectId: string;
  projectName: string;
  domain: string;
  status: "success" | "failed" | "skipped";
  lighthouseScores?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  cruxStatus?: "success" | "no_data" | "error";
  error?: string;
}

interface CronResponse {
  success: boolean;
  message: string;
  auditsRun: number;
  totalEligible: number;
  results: AuditResult[];
  executionTimeMs: number;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Validate CRON_SECRET
  if (!CRON_SECRET) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Check Authorization header
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== CRON_SECRET) {
    console.warn("SEO cron: Unauthorized request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Create admin client to bypass RLS
    const supabase = createAdminClient();

    // Calculate stale threshold date
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - STALE_THRESHOLD_DAYS);
    const staleDateIso = staleDate.toISOString();

    // Query projects with SEO enabled that have stale or no audits
    // Subquery to get the latest audit date for each project
    const { data: eligibleProjects, error: queryError } = await supabase
      .from("seo_configs")
      .select(
        `
        project_id,
        domain,
        studio_id,
        projects!inner (
          id,
          name
        )
      `
      )
      .eq("is_enabled", true)
      .not("domain", "is", null);

    if (queryError) {
      console.error("SEO cron: Error querying eligible projects:", queryError);
      return NextResponse.json(
        {
          success: false,
          message: "Database query failed",
          error: queryError.message,
        },
        { status: 500 }
      );
    }

    if (!eligibleProjects || eligibleProjects.length === 0) {
      const response: CronResponse = {
        success: true,
        message: "No SEO-enabled projects found",
        auditsRun: 0,
        totalEligible: 0,
        results: [],
        executionTimeMs: Date.now() - startTime,
      };
      return NextResponse.json(response);
    }

    // Get the latest Lighthouse audit date for each project
    const projectIds = eligibleProjects.map((p) => p.project_id);
    const { data: latestAudits, error: auditsError } = await supabase
      .from("seo_audits")
      .select("project_id, audited_at")
      .in("project_id", projectIds)
      .eq("audit_type", "lighthouse")
      .order("audited_at", { ascending: false });

    if (auditsError) {
      console.error("SEO cron: Error querying audit history:", auditsError);
      return NextResponse.json(
        {
          success: false,
          message: "Database query failed",
          error: auditsError.message,
        },
        { status: 500 }
      );
    }

    // Build a map of latest audit date per project
    const latestAuditMap = new Map<string, string>();
    if (latestAudits) {
      for (const audit of latestAudits) {
        // Only keep the first (most recent) audit for each project
        if (!latestAuditMap.has(audit.project_id)) {
          latestAuditMap.set(audit.project_id, audit.audited_at);
        }
      }
    }

    // Filter to only stale projects (no audit or audit older than threshold)
    const staleProjects = eligibleProjects.filter((p) => {
      const lastAudit = latestAuditMap.get(p.project_id);
      if (!lastAudit) return true; // Never audited
      return new Date(lastAudit) < new Date(staleDateIso);
    });

    if (staleProjects.length === 0) {
      const response: CronResponse = {
        success: true,
        message: "All projects have recent audits",
        auditsRun: 0,
        totalEligible: eligibleProjects.length,
        results: [],
        executionTimeMs: Date.now() - startTime,
      };
      return NextResponse.json(response);
    }

    // Limit to max audits per run
    const projectsToAudit = staleProjects.slice(0, MAX_AUDITS_PER_RUN);
    const results: AuditResult[] = [];

    console.log(
      `SEO cron: Running audits for ${projectsToAudit.length} of ${staleProjects.length} stale projects`
    );

    // Run audits sequentially to avoid overwhelming the API
    for (const project of projectsToAudit) {
      const projectInfo = project.projects as unknown as {
        id: string;
        name: string;
      };
      const auditResult: AuditResult = {
        projectId: project.project_id,
        projectName: projectInfo.name || "Unknown",
        domain: project.domain!,
        status: "failed",
      };

      try {
        console.log(
          `SEO cron: Auditing ${auditResult.projectName} (${auditResult.domain})`
        );

        // Run Lighthouse and CrUX in parallel
        const [lighthouseResult, cruxResult] = await Promise.all([
          runLighthouseAudit(project.domain!),
          getCoreWebVitals(project.domain!),
        ]);

        // Handle Lighthouse result
        if (isLighthouseError(lighthouseResult)) {
          auditResult.status = "failed";
          auditResult.error = lighthouseResult.message;
          console.error(
            `SEO cron: Lighthouse failed for ${auditResult.projectName}: ${lighthouseResult.message}`
          );
        } else {
          // Store Lighthouse audit
          const { error: insertError } = await supabase
            .from("seo_audits")
            .insert({
              project_id: project.project_id,
              studio_id: project.studio_id,
              audit_type: "lighthouse",
              scores: lighthouseResult.scores,
              raw_data: lighthouseResult.rawData,
              audited_at: lighthouseResult.fetchedAt,
            });

          if (insertError) {
            auditResult.status = "failed";
            auditResult.error = `Database error: ${insertError.message}`;
            console.error(
              `SEO cron: DB insert failed for ${auditResult.projectName}: ${insertError.message}`
            );
          } else {
            auditResult.status = "success";
            auditResult.lighthouseScores = lighthouseResult.scores;
            console.log(
              `SEO cron: Success for ${auditResult.projectName} - Performance: ${lighthouseResult.scores.performance}`
            );
          }
        }

        // Handle CrUX result (non-fatal if it fails)
        if (isCruxError(cruxResult)) {
          auditResult.cruxStatus = "error";
          console.warn(
            `SEO cron: CrUX error for ${auditResult.projectName}: ${cruxResult.message}`
          );
        } else if (cruxResult === null) {
          auditResult.cruxStatus = "no_data";
        } else {
          // Store CrUX data
          const { error: cruxInsertError } = await supabase
            .from("seo_audits")
            .insert({
              project_id: project.project_id,
              studio_id: project.studio_id,
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
            auditResult.cruxStatus = "error";
            console.warn(
              `SEO cron: CrUX DB insert failed for ${auditResult.projectName}: ${cruxInsertError.message}`
            );
          } else {
            auditResult.cruxStatus = "success";
          }
        }
      } catch (error) {
        auditResult.status = "failed";
        auditResult.error =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `SEO cron: Unexpected error for ${auditResult.projectName}:`,
          error
        );
      }

      results.push(auditResult);
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    const response: CronResponse = {
      success: true,
      message: `Completed ${successCount} audits, ${failedCount} failed`,
      auditsRun: results.length,
      totalEligible: staleProjects.length,
      results,
      executionTimeMs: Date.now() - startTime,
    };

    console.log(
      `SEO cron: Completed. ${successCount} success, ${failedCount} failed. Time: ${response.executionTimeMs}ms`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("SEO cron: Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        auditsRun: 0,
        totalEligible: 0,
        results: [],
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different cron providers
export async function POST(req: NextRequest) {
  return GET(req);
}
