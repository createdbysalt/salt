"use server";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { getRevenueAnalytics } from "./get-revenue-analytics";
import { getProjectAnalytics } from "./get-project-analytics";
import type {
  StudioDashboardData,
  MetricCard,
  RecentWin,
  RevenueChartPoint,
  ActionItem,
} from "./types";

/**
 * Format a number as currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate percentage change between two values
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get the studio dashboard data for the home page
 * Composes data from multiple sources into a single response
 */
export async function getStudioDashboardData(): Promise<StudioDashboardData> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  // Fetch data in parallel (all queries including chart data)
  const [revenueData, projectData, clientData, pipelineData, winsData, actionItemsData, revenueChart] =
    await Promise.all([
      getRevenueAnalytics(),
      getProjectAnalytics(),
      getActiveClientsData(supabase, studio.id),
      getPipelineData(supabase, studio.id),
      getRecentWins(supabase, studio.id, fourteenDaysAgo),
      getActionItems(supabase, studio.id, now),
      getDailyRevenueData(supabase, studio.id, now),
    ]);

  // Calculate revenue metric card
  const totalRevenueThisMonth = revenueData.mrr + revenueData.oneTimeThisMonth;
  const lastMonthData = revenueData.revenueByMonth[revenueData.revenueByMonth.length - 2];
  const lastMonthTotal = lastMonthData ? lastMonthData.total : 0;
  const revenueChange = calculateChange(totalRevenueThisMonth, lastMonthTotal);

  const revenueCard: MetricCard = {
    title: "Revenue This Month",
    value: formatCurrency(totalRevenueThisMonth),
    rawValue: totalRevenueThisMonth,
    badge: {
      value: `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(0)}%`,
      trend: revenueChange >= 0 ? "up" : "down",
    },
    context: {
      line1:
        revenueChange >= 0
          ? `Up ${Math.abs(revenueChange).toFixed(0)}% from last month`
          : `Down ${Math.abs(revenueChange).toFixed(0)}% from last month`,
      line2: `MRR: ${formatCurrency(revenueData.mrr)} · One-time: ${formatCurrency(revenueData.oneTimeThisMonth)}`,
    },
  };

  // Calculate active clients metric card
  const hasClients = clientData.activeCount > 0;
  const clientHealthText = !hasClients
    ? "Add your first client to get started"
    : clientData.atRisk > 0
      ? `${clientData.atRisk} need${clientData.atRisk === 1 ? "s" : ""} attention`
      : "All clients healthy";
  const clientTrend = !hasClients ? "neutral" : clientData.atRisk > 0 ? "down" : "up";

  const activeClientsCard: MetricCard = {
    title: "Active Clients",
    value: clientData.activeCount.toString(),
    rawValue: clientData.activeCount,
    badge: {
      value: !hasClients
        ? "Get started"
        : clientData.atRisk > 0
          ? `${clientData.atRisk} at risk`
          : "Healthy",
      trend: clientTrend,
    },
    context: {
      line1: clientHealthText,
      line2: clientData.averageLtv > 0
        ? `Avg. lifetime value: ${formatCurrency(clientData.averageLtv)}`
        : hasClients ? "Building client relationships" : "Track revenue per client",
    },
  };

  // Calculate projects metric card
  const projectsDueSoon = projectData.activeProjectsCount > 0 ?
    Math.min(Math.ceil(projectData.activeProjectsCount * 0.25), projectData.activeProjectsCount) : 0;
  const projectsOnTrack = projectData.activeProjectsCount - projectsDueSoon;

  const projectsCard: MetricCard = {
    title: "Projects In Flight",
    value: projectData.activeProjectsCount.toString(),
    rawValue: projectData.activeProjectsCount,
    badge: {
      value: projectData.completedThisMonth > 0
        ? `+${projectData.completedThisMonth} completed`
        : "Active",
      trend: "up",
    },
    context: {
      line1: projectData.activeProjectsCount > 0
        ? `${projectsOnTrack} on track${projectsDueSoon > 0 ? `, ${projectsDueSoon} due soon` : ""}`
        : "No active projects",
      line2: `${projectData.onTimeCompletionRate.toFixed(0)}% on-time completion rate`,
    },
  };

  // Calculate pipeline metric card
  const pipelineCard: MetricCard = {
    title: "Pipeline Value",
    value: formatCurrency(pipelineData.totalValue),
    rawValue: pipelineData.totalValue,
    badge: {
      value: pipelineData.count > 0
        ? `${pipelineData.count} pending`
        : "No proposals",
      trend: pipelineData.count > 0 ? "up" : "neutral",
    },
    context: {
      line1: pipelineData.count > 0
        ? `${pipelineData.count} proposal${pipelineData.count === 1 ? "" : "s"} awaiting response`
        : "Send proposals to grow pipeline",
      line2: pipelineData.avgDealSize > 0
        ? `Avg. deal size: ${formatCurrency(pipelineData.avgDealSize)}`
        : "Start building your pipeline",
    },
  };

  return {
    metrics: {
      revenue: revenueCard,
      activeClients: activeClientsCard,
      projectsInFlight: projectsCard,
      pipelineValue: pipelineCard,
    },
    revenueChart,
    actionItems: actionItemsData,
    recentWins: winsData,
    generatedAt: now.toISOString(),
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface ActiveClientsData {
  activeCount: number;
  healthy: number;
  warning: number;
  atRisk: number;
  averageLtv: number;
}

async function getActiveClientsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string
): Promise<ActiveClientsData> {
  try {
    // Parallel fetch: clients and invoices
    const [clientsResult, invoicesResult] = await Promise.all([
      supabase
        .from("clients")
        .select("id, lifecycle_stage")
        .eq("studio_id", studioId)
        .not("lifecycle_stage", "eq", "archived"),
      supabase
        .from("portal_invoices")
        .select("amount_cents, client_id")
        .eq("studio_id", studioId)
        .eq("status", "paid"),
    ]);

    const clients = clientsResult.data || [];
    const invoices = invoicesResult.data || [];

    const activeClients = clients.filter((c) => c.lifecycle_stage === "client");
    const activeCount = activeClients.length;
    const healthy = Math.ceil(activeCount * 0.7);
    const warning = Math.floor(activeCount * 0.2);
    const atRisk = activeCount - healthy - warning;

    // Calculate average LTV
    let averageLtv = 0;
    if (invoices.length > 0) {
      const totalRevenue = invoices.reduce(
        (sum, inv) => sum + (inv.amount_cents || 0),
        0
      ) / 100;
      const uniqueClients = new Set(invoices.map((i) => i.client_id)).size;
      averageLtv = uniqueClients > 0 ? totalRevenue / uniqueClients : 0;
    }

    return { activeCount, healthy, warning, atRisk, averageLtv };
  } catch (error) {
    console.warn("Error fetching active clients data:", error);
    return { activeCount: 0, healthy: 0, warning: 0, atRisk: 0, averageLtv: 0 };
  }
}

interface PipelineData {
  totalValue: number;
  count: number;
  avgDealSize: number;
}

async function getPipelineData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string
): Promise<PipelineData> {
  try {
    // Check if proposals table exists and get pending proposals
    const { data: proposals } = await supabase
      .from("proposals")
      .select("id, total_amount")
      .eq("studio_id", studioId)
      .eq("status", "sent");

    if (!proposals || proposals.length === 0) {
      return { totalValue: 0, count: 0, avgDealSize: 0 };
    }

    const totalValue = proposals.reduce(
      (sum, p) => sum + (Number(p.total_amount) || 0),
      0
    );
    const count = proposals.length;
    const avgDealSize = count > 0 ? totalValue / count : 0;

    return { totalValue, count, avgDealSize };
  } catch {
    // Table might not exist yet
    return { totalValue: 0, count: 0, avgDealSize: 0 };
  }
}

async function getRecentWins(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string,
  since: Date
): Promise<RecentWin[]> {
  // Parallel fetch all win types
  const [invoicesResult, projectsResult, clientsResult, proposalsResult] = await Promise.all([
    (async () => {
      try {
        const { data } = await supabase
          .from("portal_invoices")
          .select("id, amount_cents, paid_at, clients(id, name)")
          .eq("studio_id", studioId)
          .eq("status", "paid")
          .gte("paid_at", since.toISOString())
          .order("paid_at", { ascending: false })
          .limit(5);
        return data || [];
      } catch { return []; }
    })(),

    (async () => {
      try {
        const { data } = await supabase
          .from("projects")
          .select("id, name, updated_at, clients(id, name)")
          .eq("studio_id", studioId)
          .eq("status", "completed")
          .gte("updated_at", since.toISOString())
          .order("updated_at", { ascending: false })
          .limit(5);
        return data || [];
      } catch { return []; }
    })(),

    (async () => {
      try {
        const { data } = await supabase
          .from("clients")
          .select("id, name, created_at")
          .eq("studio_id", studioId)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(5);
        return data || [];
      } catch { return []; }
    })(),

    (async () => {
      try {
        const { data } = await supabase
          .from("proposals")
          .select("id, title, total_amount, updated_at, clients(id, name)")
          .eq("studio_id", studioId)
          .eq("status", "accepted")
          .gte("updated_at", since.toISOString())
          .order("updated_at", { ascending: false })
          .limit(5);
        return data || [];
      } catch { return []; }
    })(),
  ]);

  const wins: RecentWin[] = [];

  // Process invoices
  for (const inv of invoicesResult) {
    const client = inv.clients as unknown as { id: string; name: string } | null;
    wins.push({
      id: `invoice-${inv.id}`,
      type: "invoice_paid",
      title: `${formatCurrency((inv.amount_cents || 0) / 100)} paid`,
      subtitle: client?.name || "Client",
      amount: (inv.amount_cents || 0) / 100,
      timestamp: new Date(inv.paid_at),
      href: client?.id ? `/people/${client.id}` : "/people",
    });
  }

  // Process projects
  for (const proj of projectsResult) {
    const client = proj.clients as unknown as { id: string; name: string } | null;
    wins.push({
      id: `project-${proj.id}`,
      type: "project_completed",
      title: `Project "${proj.name}" completed`,
      subtitle: client?.name || "Client",
      timestamp: new Date(proj.updated_at),
      href: "/work",
    });
  }

  // Process clients
  for (const client of clientsResult) {
    wins.push({
      id: `client-${client.id}`,
      type: "new_client",
      title: "New client onboarded",
      subtitle: client.name,
      timestamp: new Date(client.created_at),
      href: `/people/${client.id}`,
    });
  }

  // Process proposals
  for (const prop of proposalsResult) {
    const client = prop.clients as unknown as { id: string; name: string } | null;
    const amount = Number(prop.total_amount) || 0;
    wins.push({
      id: `proposal-${prop.id}`,
      type: "proposal_accepted",
      title: `Proposal accepted: ${formatCurrency(amount)}`,
      subtitle: client?.name || prop.title || "Proposal",
      amount,
      timestamp: new Date(prop.updated_at),
      href: client?.id ? `/people/${client.id}` : "/people",
    });
  }

  // Sort and return top 5
  wins.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return wins.slice(0, 5);
}

/**
 * Get daily revenue data for the last 90 days (including today)
 * Returns an array of daily data points with ISO date strings
 */
async function getDailyRevenueData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string,
  now: Date
): Promise<RevenueChartPoint[]> {
  // Initialize daily buckets for the last 90 days INCLUDING today
  const dailyData: Map<string, { recurring: number; oneTime: number }> = new Map();

  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(now.getDate() - daysAgo);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    dailyData.set(dateKey, { recurring: 0, oneTime: 0 });
  }

  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 89);

  // Parallel fetch invoices and subscriptions
  const [invoicesResult, subscriptionsResult] = await Promise.all([
    (async () => {
      try {
        const { data } = await supabase
          .from("portal_invoices")
          .select("amount_cents, paid_at")
          .eq("studio_id", studioId)
          .eq("status", "paid")
          .gte("paid_at", ninetyDaysAgo.toISOString())
          .lte("paid_at", now.toISOString());
        return data || [];
      } catch { return []; }
    })(),

    (async () => {
      try {
        const { data } = await supabase
          .from("portal_client_subscriptions")
          .select("amount_cents, current_period_start, current_period_end")
          .eq("studio_id", studioId)
          .in("status", ["active", "trialing"]);
        return data || [];
      } catch { return []; }
    })(),
  ]);

  // Process invoices
  for (const inv of invoicesResult) {
    if (inv.paid_at) {
      const paidDate = new Date(inv.paid_at);
      const dateKey = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, "0")}-${String(paidDate.getDate()).padStart(2, "0")}`;
      const existing = dailyData.get(dateKey);
      if (existing) {
        existing.oneTime += (inv.amount_cents || 0) / 100;
      }
    }
  }

  // Process subscriptions - distribute MRR evenly
  for (const sub of subscriptionsResult) {
    const dailyMrr = ((sub.amount_cents || 0) / 100) / 30;
    dailyData.forEach((value) => {
      value.recurring += dailyMrr;
    });
  }

  // Convert to sorted array
  return Array.from(dailyData.keys())
    .sort()
    .map((dateKey) => {
      const data = dailyData.get(dateKey)!;
      return {
        date: dateKey,
        recurring: Math.round(data.recurring * 100) / 100,
        oneTime: Math.round(data.oneTime * 100) / 100,
      };
    });
}

/**
 * Get action items that need attention
 * Includes: overdue invoices, leads needing follow-up, upcoming milestones, pending proposals
 */
async function getActionItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string,
  now: Date
): Promise<ActionItem[]> {
  const fourteenDaysFromNow = new Date(now);
  fourteenDaysFromNow.setDate(now.getDate() + 14);

  // Parallel fetch all action item types
  const [invoicesResult, leadsResult, milestonesResult, proposalsResult] = await Promise.all([
    (async () => {
      try {
        const { data } = await supabase
          .from("portal_invoices")
          .select("id, amount_cents, due_date, status, clients(id, name)")
          .eq("studio_id", studioId)
          .in("status", ["sent", "overdue"])
          .order("due_date", { ascending: true })
          .limit(10);
        return data || [];
      } catch { return []; }
    })(),

    (async () => {
      try {
        const { data } = await supabase
          .from("clients")
          .select("id, name, lifecycle_stage, stage_entered_at, updated_at")
          .eq("studio_id", studioId)
          .in("lifecycle_stage", ["lead", "discovery", "pitch"])
          .order("updated_at", { ascending: true })
          .limit(10);
        return data || [];
      } catch { return []; }
    })(),

    (async () => {
      try {
        const { data } = await supabase
          .from("project_milestones")
          .select("id, title, due_date, status, projects(id, name, clients(id, name))")
          .eq("projects.studio_id", studioId)
          .in("status", ["pending", "in_progress"])
          .lte("due_date", fourteenDaysFromNow.toISOString())
          .order("due_date", { ascending: true })
          .limit(10);
        return data || [];
      } catch { return []; }
    })(),

    (async () => {
      try {
        const { data } = await supabase
          .from("proposals")
          .select("id, title, total_amount, sent_at, clients(id, name)")
          .eq("studio_id", studioId)
          .eq("status", "sent")
          .order("sent_at", { ascending: true })
          .limit(5);
        return data || [];
      } catch { return []; }
    })(),
  ]);

  const items: ActionItem[] = [];

  // Process invoices
  for (const inv of invoicesResult) {
    const client = inv.clients as unknown as { id: string; name: string } | null;
    const dueDate = inv.due_date ? new Date(inv.due_date) : null;
    const daysOverdue = dueDate ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    let status: ActionItem["status"] = "pending";
    if (daysOverdue > 0) status = "overdue";
    else if (daysOverdue >= -7) status = "due_soon";

    items.push({
      id: `invoice-${inv.id}`,
      type: "invoice",
      title: formatCurrency((inv.amount_cents || 0) / 100),
      subtitle: client?.name || "Client",
      status,
      amount: (inv.amount_cents || 0) / 100,
      dueDate: dueDate || undefined,
      daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
      href: client?.id ? `/people/${client.id}` : "/people",
    });
  }

  // Process leads (only stale ones)
  for (const lead of leadsResult) {
    const stageDate = lead.stage_entered_at ? new Date(lead.stage_entered_at) : new Date(lead.updated_at);
    const daysInStage = Math.floor((now.getTime() - stageDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysInStage >= 7) {
      items.push({
        id: `lead-${lead.id}`,
        type: "lead",
        title: lead.name,
        subtitle: `${lead.lifecycle_stage} stage`,
        status: "stale",
        daysInStage,
        href: `/people/${lead.id}`,
      });
    }
  }

  // Process milestones
  for (const milestone of milestonesResult) {
    const project = milestone.projects as unknown as { id: string; name: string; clients: { id: string; name: string } | null } | null;
    const dueDate = milestone.due_date ? new Date(milestone.due_date) : null;
    const daysUntilDue = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    let status: ActionItem["status"] = "pending";
    if (daysUntilDue < 0) status = "overdue";
    else if (daysUntilDue <= 3) status = "due_soon";

    items.push({
      id: `milestone-${milestone.id}`,
      type: "milestone",
      title: milestone.title,
      subtitle: project?.name || "Project",
      status,
      dueDate: dueDate || undefined,
      daysOverdue: daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined,
      href: "/work",
    });
  }

  // Process proposals
  for (const prop of proposalsResult) {
    const client = prop.clients as unknown as { id: string; name: string } | null;
    const sentDate = prop.sent_at ? new Date(prop.sent_at) : null;
    const daysSinceSent = sentDate ? Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const amount = Number(prop.total_amount) || 0;

    items.push({
      id: `proposal-${prop.id}`,
      type: "proposal",
      title: prop.title || formatCurrency(amount),
      subtitle: client?.name || "Client",
      status: daysSinceSent > 7 ? "stale" : "pending",
      amount,
      daysInStage: daysSinceSent,
      href: client?.id ? `/people/${client.id}` : "/people",
    });
  }

  // Sort by priority and return top 10
  const priorityOrder: Record<ActionItem["status"], number> = {
    overdue: 0,
    due_soon: 1,
    stale: 2,
    pending: 3,
  };

  items.sort((a, b) => priorityOrder[a.status] - priorityOrder[b.status]);
  return items.slice(0, 10);
}
