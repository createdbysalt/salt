"use server";

import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { requireStudioMember } from "@/libs/tenancy/guards";

export interface ProjectWithMetrics {
  id: string;
  name: string;
  description: string | null;
  status: string;
  projectType: string | null;
  clientId: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;

  // Retainer metrics (from bridge_client_subscriptions)
  isRetainer: boolean;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  monthlyAmount: number | null;
  includedHours: number | null;
  usedHours: number | null;
  renewalDate: string | null;

  // One-time metrics (from milestones)
  milestoneProgress: { completed: number; total: number } | null;
  totalValue: number | null;
  deadline: string | null;

  // Common metrics
  healthStatus: "on-track" | "at-risk" | "overdue" | null;
  taskCount: number;
  tags: Array<{ id: string; label: string; color: string }>;
}

export async function getProjectsWithMetrics(filters?: {
  type?: "one-time" | "retainer";
  clientId?: string;
  tagIds?: string[];
  search?: string;
}): Promise<ProjectWithMetrics[]> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from("projects")
    .select(`
      *,
      client:clients!inner(id, name)
    `)
    .eq("studio_id", studio.id)
    .order("updated_at", { ascending: false });

  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error("Error fetching projects:", error);
    // Keep the dashboard usable even if migrations haven't been applied yet.
    // Common cases:
    // - PGRST205: table missing in schema cache
    // - 42703/42P01: column/relation does not exist
    return [];
  }

  // Enrich each project
  const enrichedProjects = await Promise.all(
    (projects || []).map(async (project) => {
      // Get retainer subscription if exists
      const { data: subscription } = await supabase
        .from("bridge_client_subscriptions")
        .select("*")
        .eq("project_id", project.id)
        .in("status", ["active", "trialing", "past_due"])
        .single();

      const isRetainer = !!subscription;
      const monthlyAmount = subscription?.amount_cents ? subscription.amount_cents / 100 : null;
      const includedHours = project.metadata?.included_hours || null;
      const usedHours = project.metadata?.used_hours || 0;

      // Get milestone progress for one-time projects
      const { data: milestones } = await supabase
        .from("project_milestones")
        .select("id, status")
        .eq("project_id", project.id);

      const milestoneProgress = milestones
        ? {
            completed: milestones.filter((m) => m.status === "complete").length,
            total: milestones.length,
          }
        : null;

      // Get task count
      const { count: taskCount } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id);

      // Get tags
      const { data: tagAssignments } = await supabase
        .from("tag_assignments")
        .select(`
          tag:tags(id, label, color)
        `)
        .eq("entity_type", "project")
        .eq("entity_id", project.id);

      const tags = tagAssignments?.map((ta: any) => ta.tag).filter((t: any) => t) || [];

      // Determine health status
      let healthStatus: "on-track" | "at-risk" | "overdue" | null = null;
      if (isRetainer && includedHours && usedHours) {
        const utilization = usedHours / includedHours;
        if (utilization > 0.9) {
          healthStatus = "at-risk";
        } else {
          healthStatus = "on-track";
        }
      } else if (milestoneProgress && milestoneProgress.total > 0) {
        // Check for overdue milestones
        const { data: overdueMilestones } = await supabase
          .from("project_milestones")
          .select("id")
          .eq("project_id", project.id)
          .neq("status", "complete")
          .lt("due_at", new Date().toISOString())
          .limit(1);

        if (overdueMilestones && overdueMilestones.length > 0) {
          healthStatus = "overdue";
        } else {
          healthStatus = "on-track";
        }
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        projectType: project.project_type,
        clientId: project.client.id,
        clientName: project.client.name,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        isRetainer,
        subscriptionId: subscription?.id || null,
        subscriptionStatus: subscription?.status || null,
        monthlyAmount,
        includedHours,
        usedHours,
        renewalDate: subscription?.current_period_end || null,
        milestoneProgress,
        totalValue: project.metadata?.total_value || null,
        deadline: project.metadata?.deadline || null,
        healthStatus,
        taskCount: taskCount || 0,
        tags,
      };
    })
  );

  // Apply filters
  let filtered = enrichedProjects;

  if (filters?.type === "retainer") {
    filtered = filtered.filter((p) => p.isRetainer);
  } else if (filters?.type === "one-time") {
    filtered = filtered.filter((p) => !p.isRetainer);
  }

  if (filters?.tagIds && filters.tagIds.length > 0) {
    filtered = filtered.filter((p) =>
      p.tags.some((tag) => filters.tagIds!.includes(tag.id))
    );
  }

  return filtered;
}

