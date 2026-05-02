"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";

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

  // Timeline fields
  startDate: string | null;
  deadline: string | null;

  // Board metrics
  stageEnteredAt: string | null;

  // Archive/Delete status
  archivedAt: string | null;
  deletedAt: string | null;

  // Retainer metrics (from portal_client_subscriptions)
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

  // Common metrics
  healthStatus: "on-track" | "at-risk" | "overdue" | null;
  taskCount: number;
  tags: Array<{ id: string; label: string; color: string }>;
}

/**
 * Optimized project fetching with batch queries
 * Previous: ~5 queries per project (N+1 problem)
 * Now: ~6 queries total regardless of project count
 */
export async function getProjectsWithMetrics(filters?: {
  type?: "one-time" | "retainer";
  clientId?: string;
  tagIds?: string[];
  search?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
}): Promise<ProjectWithMetrics[]> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  // ============================================================================
  // Step 1: Fetch all projects (1 query)
  // ============================================================================
  let query = supabase
    .from("projects")
    .select(`
      *,
      client:clients!inner(id, name)
    `)
    .eq("studio_id", studio.id)
    .order("updated_at", { ascending: false });

  // Filter out deleted projects by default
  if (!filters?.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  // Filter out archived projects by default
  if (!filters?.includeArchived) {
    query = query.is("archived_at", null);
  }

  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }

  if (!projects || projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((p: any) => p.id);

  // ============================================================================
  // Step 2: Batch fetch all related data in parallel (~5 queries total)
  // ============================================================================
  const [
    subscriptionsResult,
    milestonesResult,
    taskCountsResult,
    tagsResult,
  ] = await Promise.all([
    // Active subscriptions for all projects
    supabase
      .from("portal_client_subscriptions")
      .select("*")
      .in("project_id", projectIds)
      .in("status", ["active", "trialing", "past_due"]),

    // All milestones for all projects
    supabase
      .from("project_milestones")
      .select("id, project_id, status, due_at")
      .in("project_id", projectIds),

    // Task counts - use RPC or aggregate if available, otherwise fetch IDs
    supabase
      .from("tasks")
      .select("id, project_id")
      .in("project_id", projectIds),

    // Tags for all projects
    supabase
      .from("tag_assignments")
      .select("entity_id, tag:tags(id, label, color)")
      .eq("entity_type", "project")
      .in("entity_id", projectIds),
  ]);

  // ============================================================================
  // Step 3: Build lookup maps for O(1) access
  // ============================================================================
  const now = new Date();

  // Subscriptions by project ID
  const subscriptionMap = new Map<string, any>();
  (subscriptionsResult.data || []).forEach((sub: any) => {
    subscriptionMap.set(sub.project_id, sub);
  });

  // Milestones by project ID (grouped)
  const milestonesMap = new Map<string, any[]>();
  (milestonesResult.data || []).forEach((m: any) => {
    const existing = milestonesMap.get(m.project_id) || [];
    existing.push(m);
    milestonesMap.set(m.project_id, existing);
  });

  // Task counts by project ID
  const taskCountMap = new Map<string, number>();
  (taskCountsResult.data || []).forEach((t: any) => {
    taskCountMap.set(t.project_id, (taskCountMap.get(t.project_id) || 0) + 1);
  });

  // Tags by project ID
  const tagsMap = new Map<string, any[]>();
  (tagsResult.data || []).forEach((ta: any) => {
    if (ta.tag) {
      const existing = tagsMap.get(ta.entity_id) || [];
      existing.push(ta.tag);
      tagsMap.set(ta.entity_id, existing);
    }
  });

  // ============================================================================
  // Step 4: Enrich projects with metrics (no additional queries!)
  // ============================================================================
  const enrichedProjects: ProjectWithMetrics[] = projects.map((project: any) => {
    const projectId = project.id;
    const subscription = subscriptionMap.get(projectId);
    const milestones = milestonesMap.get(projectId) || [];

    const isRetainer = !!subscription;
    const monthlyAmount = subscription?.amount_cents ? subscription.amount_cents / 100 : null;
    const includedHours = project.metadata?.included_hours || null;
    const usedHours = project.metadata?.used_hours || 0;

    // Calculate milestone progress
    const milestoneProgress = milestones.length > 0
      ? {
          completed: milestones.filter((m: any) => m.status === "complete").length,
          total: milestones.length,
        }
      : null;

    // Determine health status
    let healthStatus: "on-track" | "at-risk" | "overdue" | null = null;
    if (isRetainer && includedHours && usedHours) {
      const utilization = usedHours / includedHours;
      healthStatus = utilization > 0.9 ? "at-risk" : "on-track";
    } else if (milestones.length > 0) {
      // Check for overdue milestones in memory
      const hasOverdue = milestones.some(
        (m: any) => m.status !== "complete" && m.due_at && new Date(m.due_at) < now
      );
      healthStatus = hasOverdue ? "overdue" : "on-track";
    }

    return {
      id: projectId,
      name: project.name,
      description: project.description,
      status: project.status,
      projectType: project.project_type,
      clientId: project.client.id,
      clientName: project.client.name,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      startDate: project.start_date || null,
      deadline: project.deadline || project.metadata?.deadline || null,
      stageEnteredAt: project.stage_entered_at || null,
      archivedAt: project.archived_at || null,
      deletedAt: project.deleted_at || null,
      isRetainer,
      subscriptionId: subscription?.id || null,
      subscriptionStatus: subscription?.status || null,
      monthlyAmount,
      includedHours,
      usedHours,
      renewalDate: subscription?.current_period_end || null,
      milestoneProgress,
      totalValue: project.metadata?.total_value || null,
      healthStatus,
      taskCount: taskCountMap.get(projectId) || 0,
      tags: tagsMap.get(projectId) || [],
    };
  });

  // ============================================================================
  // Step 5: Apply filters in memory
  // ============================================================================
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

