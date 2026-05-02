"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";

export interface ClientWithMetrics {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactName: string | null;
  status: string;
  createdAt: string;
  lastContactAt: string | null;

  // Company
  company: {
    id: string;
    name: string;
  } | null;

  // Metrics
  projectCount: number;
  mrr: number; // Monthly Recurring Revenue
  ltv: number; // Lifetime Value
  healthScore: number;
  healthFactors: Array<{ factor: string; impact: number; reason: string }>;

  // Next meeting
  nextMeeting: {
    id: string;
    title: string;
    startTime: Date;
  } | null;

  // Tags
  tags: Array<{
    id: string;
    label: string;
    color: string;
  }>;

  // Lifecycle stage for pipeline/board view
  lifecycleStage?: "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";
  stageEnteredAt?: string | null;

  // Soft delete / archive fields
  archivedAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export type ClientViewFilter = "active" | "archived" | "deleted" | "all";

/**
 * Optimized client fetching with batch queries
 * Previous: ~13 queries per client (N+1 problem)
 * Now: ~10 queries total regardless of client count
 */
export async function getClientsWithMetrics(filters?: {
  status?: "active" | "inactive";
  tagIds?: string[];
  search?: string;
  view?: ClientViewFilter;
}): Promise<ClientWithMetrics[]> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  // ============================================================================
  // Step 1: Fetch all clients (1 query)
  // ============================================================================
  let query = supabase
    .from("clients")
    .select("*")
    .eq("studio_id", studio.id)
    .order("name");

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data: clients, error } = await query;

  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }

  // Filter by view
  const view = filters?.view || "active";
  const filteredClients = (clients || []).filter((c: any) => {
    if (view === "all") return c.deleted_at == null; // All except deleted
    if (view === "deleted") return c.deleted_at != null;
    if (view === "archived") return c.archived_at != null && c.deleted_at == null;
    return c.archived_at == null && c.deleted_at == null;
  });

  if (filteredClients.length === 0) {
    return [];
  }

  const clientIds = filteredClients.map((c: any) => c.id);

  // ============================================================================
  // Step 2: Batch fetch all related data in parallel (~8 queries total)
  // ============================================================================
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    projectsResult,
    subscriptionsResult,
    invoicesResult,
    nextMeetingsResult,
    tagsResult,
    overdueInvoicesResult,
    tasksResult,
    overdueMilestonesResult,
    cancelledMeetingsResult,
    upcomingMeetingsResult,
  ] = await Promise.all([
    // Project counts
    supabase
      .from("projects")
      .select("id, client_id")
      .in("client_id", clientIds),

    // Active subscriptions for MRR
    supabase
      .from("portal_client_subscriptions")
      .select("client_id, amount_cents, status")
      .in("client_id", clientIds)
      .in("status", ["active", "trialing"]),

    // Paid invoices for LTV
    supabase
      .from("portal_invoices")
      .select("client_id, amount_cents")
      .in("client_id", clientIds)
      .eq("status", "paid"),

    // Next meetings (get all upcoming, we'll pick the first per client)
    supabase
      .from("client_meetings")
      .select("id, client_id, title, start_time")
      .in("client_id", clientIds)
      .eq("status", "scheduled")
      .gte("start_time", now.toISOString())
      .order("start_time", { ascending: true }),

    // Tags
    supabase
      .from("tag_assignments")
      .select("entity_id, tag:tags(id, label, color)")
      .eq("entity_type", "client")
      .in("entity_id", clientIds),

    // Overdue invoices (for health score)
    supabase
      .from("portal_invoices")
      .select("id, client_id, amount_cents, due_date")
      .in("client_id", clientIds)
      .in("status", ["overdue", "sent"])
      .lt("due_date", now.toISOString()),

    // Support requests in last 30 days (for health score)
    supabase
      .from("tasks")
      .select("id, client_id")
      .in("client_id", clientIds)
      .eq("source", "client_request")
      .gte("created_at", thirtyDaysAgo.toISOString()),

    // Overdue milestones (for health score)
    supabase
      .from("projects")
      .select("id, client_id, milestones:project_milestones!inner(id, due_at, status)")
      .in("client_id", clientIds)
      .lt("milestones.due_at", now.toISOString())
      .neq("milestones.status", "complete"),

    // Cancelled/no-show meetings in last 30 days (for health score)
    supabase
      .from("client_meetings")
      .select("id, client_id")
      .in("client_id", clientIds)
      .in("status", ["cancelled", "no-show"])
      .gte("created_at", thirtyDaysAgo.toISOString()),

    // Upcoming meetings in next 30 days (for health score)
    supabase
      .from("client_meetings")
      .select("id, client_id")
      .in("client_id", clientIds)
      .eq("status", "scheduled")
      .gte("start_time", now.toISOString())
      .lte("start_time", thirtyDaysFromNow.toISOString()),
  ]);

  // ============================================================================
  // Step 3: Build lookup maps for O(1) access
  // ============================================================================

  // Project counts by client
  const projectCountMap = new Map<string, number>();
  (projectsResult.data || []).forEach((p: any) => {
    projectCountMap.set(p.client_id, (projectCountMap.get(p.client_id) || 0) + 1);
  });

  // MRR by client
  const mrrMap = new Map<string, number>();
  (subscriptionsResult.data || []).forEach((s: any) => {
    mrrMap.set(s.client_id, (mrrMap.get(s.client_id) || 0) + (s.amount_cents || 0));
  });

  // LTV by client
  const ltvMap = new Map<string, number>();
  (invoicesResult.data || []).forEach((i: any) => {
    ltvMap.set(i.client_id, (ltvMap.get(i.client_id) || 0) + (i.amount_cents || 0));
  });

  // Next meeting by client (first one only)
  const nextMeetingMap = new Map<string, any>();
  (nextMeetingsResult.data || []).forEach((m: any) => {
    if (!nextMeetingMap.has(m.client_id)) {
      nextMeetingMap.set(m.client_id, {
        id: m.id,
        title: m.title,
        startTime: new Date(m.start_time),
      });
    }
  });

  // Tags by client
  const tagsMap = new Map<string, any[]>();
  (tagsResult.data || []).forEach((ta: any) => {
    if (ta.tag) {
      const existing = tagsMap.get(ta.entity_id) || [];
      existing.push(ta.tag);
      tagsMap.set(ta.entity_id, existing);
    }
  });

  // Health score data maps
  const overdueInvoicesMap = new Map<string, number>();
  (overdueInvoicesResult.data || []).forEach((i: any) => {
    overdueInvoicesMap.set(i.client_id, (overdueInvoicesMap.get(i.client_id) || 0) + 1);
  });

  const tasksMap = new Map<string, number>();
  (tasksResult.data || []).forEach((t: any) => {
    tasksMap.set(t.client_id, (tasksMap.get(t.client_id) || 0) + 1);
  });

  const overdueMilestonesMap = new Map<string, number>();
  (overdueMilestonesResult.data || []).forEach((p: any) => {
    overdueMilestonesMap.set(p.client_id, (overdueMilestonesMap.get(p.client_id) || 0) + 1);
  });

  const cancelledMeetingsMap = new Map<string, number>();
  (cancelledMeetingsResult.data || []).forEach((m: any) => {
    cancelledMeetingsMap.set(m.client_id, (cancelledMeetingsMap.get(m.client_id) || 0) + 1);
  });

  const upcomingMeetingsMap = new Map<string, number>();
  (upcomingMeetingsResult.data || []).forEach((m: any) => {
    upcomingMeetingsMap.set(m.client_id, (upcomingMeetingsMap.get(m.client_id) || 0) + 1);
  });

  // Has active retainer (from subscriptions)
  const hasRetainerMap = new Map<string, boolean>();
  (subscriptionsResult.data || []).forEach((s: any) => {
    hasRetainerMap.set(s.client_id, true);
  });

  // ============================================================================
  // Step 4: Enrich clients with metrics (no additional queries!)
  // ============================================================================
  const enrichedClients: ClientWithMetrics[] = filteredClients.map((client: any) => {
    const clientId = client.id;

    // Calculate health score in memory
    const { score: healthScore, factors: healthFactors } = calculateHealthScoreInMemory({
      lastContactAt: client.last_contact_at,
      overdueInvoiceCount: overdueInvoicesMap.get(clientId) || 0,
      taskCount: tasksMap.get(clientId) || 0,
      overdueProjectCount: overdueMilestonesMap.get(clientId) || 0,
      upcomingMeetingCount: upcomingMeetingsMap.get(clientId) || 0,
      cancelledMeetingCount: cancelledMeetingsMap.get(clientId) || 0,
      hasActiveRetainer: hasRetainerMap.get(clientId) || false,
    });

    return {
      id: clientId,
      name: client.name,
      contactEmail: client.contact_email,
      contactPhone: client.contact_phone,
      contactName: client.contact_name || null,
      status: client.status || "active",
      createdAt: client.created_at,
      lastContactAt: client.last_contact_at || null,
      company: null,
      projectCount: projectCountMap.get(clientId) || 0,
      mrr: (mrrMap.get(clientId) || 0) / 100,
      ltv: (ltvMap.get(clientId) || 0) / 100,
      healthScore,
      healthFactors,
      nextMeeting: nextMeetingMap.get(clientId) || null,
      tags: tagsMap.get(clientId) || [],
      lifecycleStage: client.lifecycle_stage || "lead",
      stageEnteredAt: client.stage_entered_at || null,
      archivedAt: client.archived_at || null,
      deletedAt: client.deleted_at || null,
      deletedBy: client.deleted_by || null,
    };
  });

  // Apply tag filter if provided
  if (filters?.tagIds && filters.tagIds.length > 0) {
    return enrichedClients.filter((client) =>
      client.tags.some((tag) => filters.tagIds!.includes(tag.id))
    );
  }

  return enrichedClients;
}

/**
 * Calculate health score in memory (no database queries)
 */
function calculateHealthScoreInMemory(data: {
  lastContactAt: string | null;
  overdueInvoiceCount: number;
  taskCount: number;
  overdueProjectCount: number;
  upcomingMeetingCount: number;
  cancelledMeetingCount: number;
  hasActiveRetainer: boolean;
}): { score: number; factors: Array<{ factor: string; impact: number; reason: string }> } {
  let score = 75;
  const factors: Array<{ factor: string; impact: number; reason: string }> = [];

  // Factor 1: Last Contact Date
  if (data.lastContactAt) {
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(data.lastContactAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceContact > 30) {
      const penalty = Math.min(30, daysSinceContact - 30);
      score -= penalty;
      factors.push({
        factor: "Last Contact",
        impact: -penalty,
        reason: `${daysSinceContact} days since last contact`,
      });
    } else if (daysSinceContact > 14) {
      score -= 10;
      factors.push({
        factor: "Last Contact",
        impact: -10,
        reason: `${daysSinceContact} days since last contact (warning)`,
      });
    }
  } else {
    score -= 15;
    factors.push({
      factor: "Last Contact",
      impact: -15,
      reason: "No contact date recorded",
    });
  }

  // Factor 2: Payment Status
  if (data.overdueInvoiceCount > 0) {
    score -= 20;
    factors.push({
      factor: "Payment Status",
      impact: -20,
      reason: `${data.overdueInvoiceCount} overdue invoice(s)`,
    });
  }

  // Factor 3: Support Volume
  if (data.taskCount > 10) {
    score -= 10;
    factors.push({
      factor: "Support Volume",
      impact: -10,
      reason: `${data.taskCount} support requests in last 30 days (high volume)`,
    });
  }

  // Factor 4: Project Timeline
  if (data.overdueProjectCount > 0) {
    score -= 15;
    factors.push({
      factor: "Project Timeline",
      impact: -15,
      reason: `${data.overdueProjectCount} project(s) with overdue milestones`,
    });
  }

  // Factor 5: Meeting Presence
  if (data.upcomingMeetingCount === 0) {
    score -= 10;
    factors.push({
      factor: "Meeting Presence",
      impact: -10,
      reason: "No meetings scheduled in next 30 days",
    });
  }

  // Factor 6: Meeting Reliability
  if (data.cancelledMeetingCount >= 2) {
    score -= 5;
    factors.push({
      factor: "Meeting Reliability",
      impact: -5,
      reason: `${data.cancelledMeetingCount} cancelled/no-show meetings in last 30 days`,
    });
  }

  // Positive Factor: Active Retainer
  if (data.hasActiveRetainer) {
    score += 10;
    factors.push({
      factor: "Active Retainer",
      impact: +10,
      reason: "Client has active retainer subscription",
    });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    factors,
  };
}

/**
 * Get counts for each client view (active, archived, deleted)
 */
export interface ClientViewCounts {
  active: number;
  archived: number;
  deleted: number;
}

export async function getClientViewCounts(): Promise<ClientViewCounts> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, archived_at, deleted_at")
    .eq("studio_id", studio.id);

  if (error || !clients) {
    console.error("Error fetching client counts:", error);
    return { active: 0, archived: 0, deleted: 0 };
  }

  const counts = { active: 0, archived: 0, deleted: 0 };

  for (const client of clients) {
    if (client.deleted_at != null) {
      counts.deleted++;
    } else if (client.archived_at != null) {
      counts.archived++;
    } else {
      counts.active++;
    }
  }

  return counts;
}
