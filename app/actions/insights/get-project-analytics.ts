"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";
import type { ProjectAnalytics } from "./types";

/**
 * Calculate project delivery analytics
 * - On-time completion rate
 * - Average duration
 * - Milestone completion rate
 */
export async function getProjectAnalytics(): Promise<ProjectAnalytics> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get active projects
  const { data: activeProjects } = await supabase
    .from("projects")
    .select("id, created_at, status")
    .eq("studio_id", studio.id)
    .in("status", ["active", "signed"]);

  const activeProjectsCount = activeProjects?.length || 0;

  // Get completed projects (for rate calculations)
  const { data: completedProjects } = await supabase
    .from("projects")
    .select("id, created_at, updated_at, status")
    .eq("studio_id", studio.id)
    .eq("status", "completed");

  const allCompleted = completedProjects || [];

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

  // On-time completion rate (Phase 1: approximate with completed vs active)
  // In the future, track actual due dates vs completion dates
  const onTimeCompletionRate =
    allCompleted.length > 0
      ? (allCompleted.length / (allCompleted.length + activeProjectsCount)) *
        100
      : 100;

  // Milestone completion rate
  let milestoneCompletionRate = 0;
  try {
    const { data: allMilestones } = await supabase
      .from("project_milestones")
      .select("id, status")
      .eq("studio_id", studio.id);

    if (allMilestones && allMilestones.length > 0) {
      const completed = allMilestones.filter(
        (m) => m.status === "complete"
      ).length;
      milestoneCompletionRate = (completed / allMilestones.length) * 100;
    }
  } catch (e) {
    console.warn("Error fetching milestones for project analytics:", e);
  }

  return {
    onTimeCompletionRate,
    averageDurationDays: Math.round(averageDurationDays),
    activeProjectsCount,
    completedThisMonth,
    milestoneCompletionRate,
  };
}

