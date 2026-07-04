"use server";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  checkBillingHygiene,
  checkFileHygiene,
  checkMeetingHygiene,
  checkOrgHygiene,
  checkPersonHygiene,
  checkWorkHygiene,
  surfaceHygieneFindings,
  type HygieneIssue,
} from "../generators/hygiene-generator";

/**
 * Check hygiene for a single organization (event-driven)
 * Called after org creation or significant updates
 */
export async function checkOrgHygieneAction(
  orgId: string
): Promise<{ success: boolean; issues: number; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);

    const issues = await checkOrgHygiene(workspace.id, orgId);
    const result = await surfaceHygieneFindings(workspace.id, issues);

    return { success: true, issues: result.created };
  } catch (err) {
    console.error("Error checking org hygiene:", err);
    return {
      success: false,
      issues: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Check hygiene for a single person (event-driven)
 * Called after person creation or significant updates
 */
export async function checkPersonHygieneAction(
  personId: string
): Promise<{ success: boolean; issues: number; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);

    const issues = await checkPersonHygiene(workspace.id, personId);
    const result = await surfaceHygieneFindings(workspace.id, issues);

    return { success: true, issues: result.created };
  } catch (err) {
    console.error("Error checking person hygiene:", err);
    return {
      success: false,
      issues: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get a summary of unresolved hygiene issues for the workspace
 * Used for weekly hygiene summary Play
 */
export async function getHygieneSummary(): Promise<{
  success: boolean;
  summary?: {
    totalIssues: number;
    byType: Record<string, number>;
    topIssues: Array<{
      id: string;
      title: string;
      entityType: string;
      entityName: string;
      hygieneType: string;
    }>;
  };
  error?: string;
}> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const admin = createAdminClient();

    // Get all unresolved hygiene findings
    const { data: findings, error } = await admin
      .from("intelligence_findings")
      .select(`
        id,
        title,
        evidence,
        person_id,
        org_id,
        people:person_id(name),
        organizations:org_id(name)
      `)
      .eq("workspace_id", workspace.id)
      .eq("finding_type", "needs_routing")
      .eq("state", "needs_you")
      .not("evidence->>hygiene_type", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!findings || findings.length === 0) {
      return {
        success: true,
        summary: {
          totalIssues: 0,
          byType: {},
          topIssues: [],
        },
      };
    }

    // Count by type
    const byType: Record<string, number> = {};
    for (const finding of findings) {
      const hygieneType = (finding.evidence as Record<string, unknown>)?.hygiene_type as string;
      if (hygieneType) {
        byType[hygieneType] = (byType[hygieneType] ?? 0) + 1;
      }
    }

    // Map top issues
    const topIssues = findings.slice(0, 10).map((f) => {
      const evidence = f.evidence as Record<string, unknown>;
      const entityType = f.person_id ? "person" : "organization";

      // Supabase joins can return arrays or single objects depending on cardinality
      const peopleData = f.people as { name: string } | { name: string }[] | null;
      const orgsData = f.organizations as { name: string } | { name: string }[] | null;

      const personName = Array.isArray(peopleData) ? peopleData[0]?.name : peopleData?.name;
      const orgName = Array.isArray(orgsData) ? orgsData[0]?.name : orgsData?.name;

      const entityName =
        entityType === "person"
          ? personName ?? "Unknown"
          : orgName ?? "Unknown";

      return {
        id: f.id,
        title: f.title,
        entityType,
        entityName,
        hygieneType: (evidence?.hygiene_type as string) ?? "unknown",
      };
    });

    return {
      success: true,
      summary: {
        totalIssues: findings.length,
        byType,
        topIssues,
      },
    };
  } catch (err) {
    console.error("Error getting hygiene summary:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Run a light hygiene scan for the workspace
 * Creates a single grouped Play if issues are found
 * Designed to run weekly, not daily
 */
export async function runWeeklyHygieneScan(): Promise<{
  success: boolean;
  playCreated: boolean;
  issuesFound: number;
  error?: string;
}> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const admin = createAdminClient();

    const allIssues: HygieneIssue[] = [];

    // Scan organizations (limit to avoid expensive queries)
    const { data: orgs } = await admin
      .from("organizations")
      .select("id")
      .eq("workspace_id", workspace.id)
      .is("industry_parent", null)
      .limit(20);

    if (orgs) {
      for (const org of orgs) {
        const issues = await checkOrgHygiene(workspace.id, org.id);
        allIssues.push(...issues);
      }
    }

    // Scan people with no recent activity (limit to avoid expensive queries)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: stalePeople } = await admin
      .from("people")
      .select("id")
      .eq("workspace_id", workspace.id)
      .lt("updated_at", thirtyDaysAgo)
      .limit(20);

    if (stalePeople) {
      for (const person of stalePeople) {
        const issues = await checkPersonHygiene(workspace.id, person.id);
        allIssues.push(...issues);
      }
    }

    // Scan open work (stalled / missing stage)
    const { data: openWork } = await admin
      .from("work")
      .select("id")
      .eq("workspace_id", workspace.id)
      .in("status", ["signed", "active"])
      .is("deleted_at", null)
      .limit(20);

    for (const work of openWork ?? []) {
      allIssues.push(...(await checkWorkHygiene(workspace.id, work.id)));
    }

    // Scan open billing (overdue unlinked / missing work link)
    const { data: openBilling } = await admin
      .from("billing_records")
      .select("id")
      .eq("workspace_id", workspace.id)
      .in("status", ["due", "overdue", "partial"])
      .limit(20);

    for (const record of openBilling ?? []) {
      allIssues.push(...(await checkBillingHygiene(workspace.id, record.id)));
    }

    // Scan recently completed meetings (no outcome recorded)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentMeetings } = await admin
      .from("meetings")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("status", "completed")
      .gte("end_time", fourteenDaysAgo)
      .limit(20);

    for (const meeting of recentMeetings ?? []) {
      allIssues.push(...(await checkMeetingHygiene(workspace.id, meeting.id)));
    }

    // Scan files (unlinked / expiring)
    const { data: recentFiles } = await admin
      .from("files")
      .select("id")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(20);

    for (const file of recentFiles ?? []) {
      allIssues.push(...(await checkFileHygiene(workspace.id, file.id)));
    }

    if (allIssues.length === 0) {
      return { success: true, playCreated: false, issuesFound: 0 };
    }

    // Surface as individual findings (they'll show in Plays queue)
    const result = await surfaceHygieneFindings(workspace.id, allIssues);

    return {
      success: true,
      playCreated: result.created > 0,
      issuesFound: result.created,
    };
  } catch (err) {
    console.error("Error running weekly hygiene scan:", err);
    return {
      success: false,
      playCreated: false,
      issuesFound: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
