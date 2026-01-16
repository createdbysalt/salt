"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  status: "not_started" | "in_progress" | "complete";
  orderIndex: number;
  dependsOnMilestoneId: string | null;
  clientVisible: boolean;
  taskCount?: number;
  completedTaskCount?: number;
}

/**
 * Get all milestones for a project (ordered by order_index).
 */
export async function getMilestones(projectId: string): Promise<Milestone[]> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  // Verify project belongs to this studio
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("studio_id", studio.id)
    .single();

  if (!project) {
    // Project may not exist (or schema not ready). Return empty milestones.
    return [];
  }

  // Fetch milestones with task counts
  const { data, error } = await supabase
    .from("project_milestones")
    .select(
      `
      *,
      tasks:tasks(id, status)
    `
    )
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching milestones:", error);
    // Return empty array instead of throwing - keeps UI stable during migration.
    return [];
  }

  return (data || []).map((milestone: any) => ({
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    dueAt: milestone.due_at ? new Date(milestone.due_at) : null,
    completedAt: milestone.completed_at ? new Date(milestone.completed_at) : null,
    status: milestone.status,
    orderIndex: milestone.order_index,
    dependsOnMilestoneId: milestone.depends_on_milestone_id,
    clientVisible: milestone.client_visible,
    taskCount: milestone.tasks?.length || 0,
    completedTaskCount:
      milestone.tasks?.filter((t: any) => t.status === "completed").length || 0,
  }));
}

