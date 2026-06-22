"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type { ProjectAnalytics } from "./types";

/**
 * Calculate project delivery analytics
 * - On-time completion rate
 * - Average duration
 * - Milestone completion rate
 *
 * OPTIMIZED: Parallel queries instead of sequential
 */
export async function getProjectAnalytics(): Promise<ProjectAnalytics> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Parallel fetch all project data
  const [activeProjectsResult, completedProjectsResult, milestonesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, created_at, status")
      .eq("studio_id", studio.id)
      .in("status", ["active", "signed"]),

    supabase
      .from("projects")
      .select("id, created_at, updated_at, status")
      .eq("studio_id", studio.id)
      .eq("status", "completed"),

    (async () => {
      try {
        const { data } = await supabase
          .from("project_milestones")
          .select("id, status")
          .eq("studio_id", studio.id);
        return data || [];
      } catch { return []; }
    })(),
  ]);

  const activeProjectsCount = activeProjectsResult.data?.length || 0;
  const allCompleted = completedProjectsResult.data || [];

  // Calculate average duration (for completed projects)
  let totalDurationDays = 0;
  for (const project of allCompleted) {
    const start = new Date(project.created_at);
    const end = new Date(project.updated_at || now);
    const days = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    totalDurationDays += days;
  }
  const averageDurationDays =
    allCompleted.length > 0 ? totalDurationDays / allCompleted.length : 0;

  // Completed this month
  const completedThisMonth = allCompleted.filter((p) => {
    const updated = new Date(p.updated_at || p.created_at);
    return updated >= firstDayThisMonth;
  }).length;

  // On-time completion rate
  const onTimeCompletionRate =
    allCompleted.length > 0
      ? (allCompleted.length / (allCompleted.length + activeProjectsCount)) *
        100
      : 100;

  // Milestone completion rate
  let milestoneCompletionRate = 0;
  const milestones = milestonesResult as Array<{ id: string; status: string }>;
  if (milestones.length > 0) {
    const completed = milestones.filter((m) => m.status === "complete").length;
    milestoneCompletionRate = (completed / milestones.length) * 100;
  }

  return {
    onTimeCompletionRate,
    averageDurationDays: Math.round(averageDurationDays),
    activeProjectsCount,
    completedThisMonth,
    milestoneCompletionRate,
  };
}

