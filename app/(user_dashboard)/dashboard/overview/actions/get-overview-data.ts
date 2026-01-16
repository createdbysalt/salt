"use server";

import { unstable_cache } from "next/cache";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import type { TaskWithRelations } from "@/app/_features/tasks/types";

export interface OverviewData {
  heroMetrics: {
    mrr: number;
    pipeline: number;
    thisMonth: number;
  };
  todayTasks: {
    urgent: TaskWithRelations[];
    dueToday: TaskWithRelations[];
    dueThisWeek: TaskWithRelations[];
    urgentCount: number;
    dueTodayCount: number;
    dueThisWeekCount: number;
  };
  projects: {
    activeCount: number;
    retainerCount: number;
    oneTimeCount: number;
    recentProjects: Array<{
      id: string;
      name: string;
      clientName: string;
      status: string;
      isRecurring: boolean;
      monthlyValue: number | null;
      totalValue: number | null;
      healthStatus: string | null;
    }>;
  };
  clients: {
    totalCount: number;
    healthAverage: number;
    atRiskCount: number;
    staleContactCount: number;
  };
  settings: {
    atRiskThreshold: number;
    staleContactDays: number;
    timezone: string;
  };
}

/**
 * Compute client health score from grounded signals
 */
function computeClientHealth(
  client: any,
  overdueInvoicesCount: number,
  tasksCount: number,
  staleContactDays: number
): number {
  let score = 100;

  // Check last contact (stale = -30 points)
  const lastContact = client.settings?.lastContact;
  if (lastContact) {
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceContact > staleContactDays) {
      score -= 30;
    }
  } else {
    // No contact record at all = -20 points
    score -= 20;
  }

  // Overdue invoices (-15 points per invoice, max -30)
  score -= Math.min(overdueInvoicesCount * 15, 30);

  // High task volume (-10 if >5 open tasks)
  if (tasksCount > 5) {
    score -= 10;
  }

  // Check project health if available
  // (This would come from projects.metadata.healthStatus if we had it)

  return Math.max(0, Math.min(100, score));
}

/**
 * Get overview dashboard data (non-cached version with dynamic data access)
 */
async function fetchOverviewData(
  studioId: string,
  supabase: any,
  settings: any
): Promise<OverviewData> {

  // Use passed-in settings
  const atRiskThreshold = settings?.dashboard?.overview?.atRiskThreshold || 70;
  const staleContactDays = settings?.dashboard?.overview?.staleContactDays || 14;
  const timezone = settings?.dashboard?.overview?.timezone || "UTC";

  // Run all queries in parallel for performance
  const [
    mrrResult,
    projectsResult,
    tasksResult,
    clientsResult,
    invoicesResult,
    subscriptionInvoicesResult,
  ] = await Promise.all([
    // 1. MRR from studio_mrr view (primary) or fallback to project metadata
    supabase.from("studio_mrr").select("mrr_usd").eq("studio_id", studioId).maybeSingle(),

    // 2. All active projects with client info
    supabase
      .from("projects")
      .select("id, name, status, metadata, clients(name)")
      .eq("studio_id", studioId)
      .in("status", ["active", "signed"])
      .order("updated_at", { ascending: false })
      .limit(25),

    // 3. Tasks needing attention (open/in_progress with urgency/due dates)
    supabase
      .from("tasks")
      .select(
        `
        *,
        project:projects(id, name, slug),
        client:clients(id, name, slug),
        assignee:profiles!tasks_assigned_to_fkey(id, display_name, email, avatar_url)
      `
      )
      .eq("studio_id", studioId)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(50),

    // 4. All clients for health calculation
    supabase
      .from("clients")
      .select("id, name, settings")
      .eq("studio_id", studioId),

    // 5. This month's paid invoices
    supabase
      .from("bridge_invoices")
      .select("amount_cents, currency, paid_at")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .gte("paid_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .lte("paid_at", new Date().toISOString()),

    // 6. This month's paid subscription invoices
    supabase
      .from("bridge_subscription_invoices")
      .select("amount_cents, subscription:bridge_client_subscriptions!inner(studio_id), paid_at")
      .eq("subscription.studio_id", studioId)
      .eq("status", "paid")
      .gte("paid_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .lte("paid_at", new Date().toISOString()),
  ]);

  // === HERO METRICS ===
  let mrr = 0;
  let pipeline = 0;

  // MRR calculation (primary: view, fallback: project metadata)
  if (mrrResult.data) {
    mrr = mrrResult.data.mrr_usd || 0;
  } else if (projectsResult.data) {
    // Fallback: sum monthlyValue from retainer projects
    mrr = projectsResult.data
      .filter((p: any) => p.metadata?.isRecurring || p.metadata?.is_recurring)
      .reduce((sum: number, p: any) => sum + (p.metadata?.monthlyValue || p.metadata?.monthly_value || 0), 0);
  }

  // Pipeline calculation (one-time projects)
  if (projectsResult.data) {
    pipeline = projectsResult.data
      .filter((p: any) => !(p.metadata?.isRecurring || p.metadata?.is_recurring))
      .reduce((sum: number, p: any) => sum + (p.metadata?.totalValue || p.metadata?.total_value || 0), 0);
  }

  // This month revenue (paid invoices + subscription invoices)
  const thisMonthFromInvoices = (invoicesResult.data || [])
    .filter((inv: any) => inv.currency === "usd") // USD only for now
    .reduce((sum: number, inv: any) => sum + (inv.amount_cents || 0), 0) / 100;

  const thisMonthFromSubs = (subscriptionInvoicesResult.data || [])
    .reduce((sum: number, inv: any) => sum + (inv.amount_cents || 0), 0) / 100;

  const thisMonth = thisMonthFromInvoices + thisMonthFromSubs;

  // === TODAY TASKS ===
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const allTasks = (tasksResult.data || []) as TaskWithRelations[];

  const urgent = allTasks
    .filter((t) => t.is_urgent || t.priority === "revenue_blocker" || t.priority === "urgent")
    .slice(0, 3);

  const dueToday = allTasks
    .filter((t) => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    })
    .slice(0, 3);

  const dueThisWeek = allTasks
    .filter((t) => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= today && dueDate < nextWeek;
    })
    .slice(0, 3);

  const urgentCount = allTasks.filter(
    (t) => t.is_urgent || t.priority === "revenue_blocker" || t.priority === "urgent"
  ).length;
  const dueTodayCount = allTasks.filter((t) => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
  }).length;
  const dueThisWeekCount = allTasks.filter((t) => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate >= today && dueDate < nextWeek;
  }).length;

  // === PROJECTS ===
  const projects = projectsResult.data || [];
  const retainerProjects = projects.filter((p: any) => p.metadata?.isRecurring || p.metadata?.is_recurring);
  const oneTimeProjects = projects.filter((p: any) => !(p.metadata?.isRecurring || p.metadata?.is_recurring));

  const recentProjects = projects.slice(0, 10).map((p: any) => ({
    id: p.id,
    name: p.name,
    clientName: p.clients?.name || "No client",
    status: p.status,
    isRecurring: p.metadata?.isRecurring || p.metadata?.is_recurring || false,
    monthlyValue: p.metadata?.monthlyValue || p.metadata?.monthly_value || null,
    totalValue: p.metadata?.totalValue || p.metadata?.total_value || null,
    healthStatus: p.metadata?.healthStatus || p.metadata?.health_status || null,
  }));

  // === CLIENTS & HEALTH ===
  const clients = clientsResult.data || [];

  // Get overdue invoices per client
  const overdueInvoicesResult = await supabase
    .from("bridge_invoices")
    .select("client_id")
    .eq("studio_id", studioId)
    .in("status", ["sent", "viewed", "overdue"])
    .lt("due_date", new Date().toISOString());

  const overdueByClient: Record<string, number> = {};
  (overdueInvoicesResult.data || []).forEach((inv: any) => {
    overdueByClient[inv.client_id] = (overdueByClient[inv.client_id] || 0) + 1;
  });

  // Get task counts per client
  const tasksByClient: Record<string, number> = {};
  allTasks.forEach((t) => {
    if (t.client_id) {
      tasksByClient[t.client_id] = (tasksByClient[t.client_id] || 0) + 1;
    }
  });

  // Compute health for each client
  const clientHealthScores = clients.map((c: any) => {
    const overdueCount = overdueByClient[c.id] || 0;
    const taskCount = tasksByClient[c.id] || 0;
    return computeClientHealth(c, overdueCount, taskCount, staleContactDays);
  });

  const healthAverage = clientHealthScores.length > 0
    ? clientHealthScores.reduce((sum: number, s: number) => sum + s, 0) / clientHealthScores.length
    : 100;

  const atRiskCount = clientHealthScores.filter((s: number) => s < atRiskThreshold).length;

  const staleContactCount = clients.filter((c: any) => {
    const lastContact = c.settings?.lastContact;
    if (!lastContact) return true;
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceContact > staleContactDays;
  }).length;

  return {
    heroMetrics: {
      mrr: Math.round(mrr),
      pipeline: Math.round(pipeline),
      thisMonth: Math.round(thisMonth),
    },
    todayTasks: {
      urgent,
      dueToday,
      dueThisWeek,
      urgentCount,
      dueTodayCount,
      dueThisWeekCount,
    },
    projects: {
      activeCount: projects.length,
      retainerCount: retainerProjects.length,
      oneTimeCount: oneTimeProjects.length,
      recentProjects,
    },
    clients: {
      totalCount: clients.length,
      healthAverage: Math.round(healthAverage),
      atRiskCount,
      staleContactCount,
    },
    settings: {
      atRiskThreshold,
      staleContactDays,
      timezone,
    },
  };
}

/**
 * Cached version of fetchOverviewData (5 minutes)
 * Note: This must receive all dynamic data as arguments
 */
const getCachedOverviewData = unstable_cache(
  async (studioId: string, settings: any, supabaseData: any) => {
    // Recreate a minimal supabase-like object for queries
    // Note: This works because unstable_cache serializes the function
    return fetchOverviewData(studioId, supabaseData, settings);
  },
  ["overview-data"],
  {
    revalidate: 300, // 5 minutes
    tags: ["overview"],
  }
);

/**
 * Main export: Get overview data with proper cache handling
 * Accesses dynamic data (headers/cookies) outside the cache scope
 */
export async function getOverviewData(): Promise<OverviewData> {
  const { studio, supabase } = await getStudioContext();

  // Get studio settings (dynamic)
  const { data: studioDetails } = await supabase
    .from("studios")
    .select("settings")
    .eq("id", studio.id)
    .single();

  const settings = studioDetails?.settings || {};

  // Call the non-cached version directly (caching doesn't work well with Supabase client)
  // The Supabase client needs access to headers/cookies which can't be serialized
  return fetchOverviewData(studio.id, supabase, settings);
}

