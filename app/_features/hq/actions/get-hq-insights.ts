"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type {
  BusinessHealthScore,
  ClientHealthDistribution,
  DeliveryPerformance,
  HqInsightsData,
  HqPipelineStage,
  MetricCard,
  RevenueTrendPoint,
} from "./types";

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMonthName(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function getHqInsightsData(): Promise<HqInsightsData> {
  const { context } = await getTenantContext();
  const studio = requireWorkspaceMember(context);
  const supabase = await createClient();

  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Fetch all data in parallel
  const [
    peopleResult,
    orgsResult,
    projectsResult,
    milestonesResult,
    invoicesResult,
    proposalsResult,
    subscriptionsResult,
  ] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, relationship_status, created_at, updated_at")
      .eq("workspace_id", studio.id)
      .is("deleted_at", null),
    supabase
      .from("organizations")
      .select("id, name, relationship_status, created_at, updated_at")
      .eq("workspace_id", studio.id)
      .is("deleted_at", null),
    supabase
      .from("work")
      .select("id, name, status, created_at, updated_at")
      .eq("workspace_id", studio.id),
    supabase
      .from("milestones")
      .select("id, status, due_date, completed_at")
      .eq("workspace_id", studio.id),
    supabase
      .from("billing_records")
      .select("id, amount_cents, status, paid_at, due_at, created_at")
      .eq("workspace_id", studio.id)
      .eq("direction", "receivable"),
    supabase
      .from("proposals")
      .select("id, total_amount, status, created_at, updated_at")
      .eq("workspace_id", studio.id),
    supabase
      .from("work")
      .select("id, retainer_mrr_cents, status, created_at")
      .eq("workspace_id", studio.id)
      .eq("work_type", "retainer"),
  ]);

  // People + organizations replace the legacy clients table; relationship_status
  // maps the old lifecycle stages (lead -> lead, prospect stays, active -> client)
  const relationshipEntities = [
    ...(peopleResult.data || []),
    ...(orgsResult.data || []),
  ];
  const projects = projectsResult.data || [];
  const milestones = milestonesResult.data || [];
  const invoices = invoicesResult.data || [];
  const proposals = proposalsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];

  // ============================================================================
  // CALCULATE REVENUE METRICS
  // ============================================================================

  // MRR from active retainer work
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "signed" || s.status === "active"
  );
  const currentMrr = activeSubscriptions.reduce(
    (sum, s) => sum + (Number(s.retainer_mrr_cents) || 0) / 100,
    0
  );

  // Revenue this month from paid receivables
  const paidThisMonth = invoices
    .filter((i) => i.status === "paid" && i.paid_at && new Date(i.paid_at) >= startOfMonth)
    .reduce((sum, i) => sum + (Number(i.amount_cents) || 0) / 100, 0);

  // Revenue last month
  const paidLastMonth = invoices
    .filter(
      (i) =>
        i.status === "paid" &&
        i.paid_at &&
        new Date(i.paid_at) >= startOfLastMonth &&
        new Date(i.paid_at) <= endOfLastMonth
    )
    .reduce((sum, i) => sum + (Number(i.amount_cents) || 0) / 100, 0);

  const revenueTrend = paidLastMonth > 0
    ? ((paidThisMonth - paidLastMonth) / paidLastMonth) * 100
    : 0;

  // ============================================================================
  // CALCULATE CLIENT METRICS
  // ============================================================================

  const activeClients = relationshipEntities.filter(
    (entity) => entity.relationship_status === "client"
  );

  // Client health based on last activity
  const clientHealthDistribution: ClientHealthDistribution = {
    healthy: 0,
    warning: 0,
    atRisk: 0,
  };

  for (const client of activeClients) {
    const lastActivity = new Date(client.updated_at);
    const daysSinceActivity = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceActivity <= 14) {
      clientHealthDistribution.healthy++;
    } else if (daysSinceActivity <= 30) {
      clientHealthDistribution.warning++;
    } else {
      clientHealthDistribution.atRisk++;
    }
  }

  // ============================================================================
  // CALCULATE DELIVERY METRICS
  // ============================================================================

  const completedMilestones = milestones.filter((m) => m.status === "completed");
  const pendingMilestones = milestones.filter((m) => m.status !== "completed");

  let onTimeMilestones = 0;
  let lateMilestones = 0;

  for (const milestone of completedMilestones) {
    if (!milestone.due_date || !milestone.completed_at) continue;
    const dueDate = new Date(milestone.due_date);
    const completedAt = new Date(milestone.completed_at);
    if (completedAt <= dueDate) {
      onTimeMilestones++;
    } else {
      lateMilestones++;
    }
  }

  const deliveryPerformance: DeliveryPerformance = {
    onTime: onTimeMilestones,
    late: lateMilestones,
    pending: pendingMilestones.length,
  };

  const totalTrackedDeliveries = onTimeMilestones + lateMilestones;
  const onTimeRate = totalTrackedDeliveries > 0
    ? (onTimeMilestones / totalTrackedDeliveries) * 100
    : 100;

  // ============================================================================
  // CALCULATE PIPELINE METRICS
  // ============================================================================

  const pipelineStatuses = ["lead", "prospect"];
  const pipelineClients = relationshipEntities.filter((entity) =>
    pipelineStatuses.includes(entity.relationship_status || "")
  );

  const sentProposals = proposals.filter((p) => p.status === "sent");
  const pipelineValue = sentProposals.reduce(
    (sum, p) => sum + (Number(p.total_amount) || 0),
    0
  );

  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const totalProposals = sentProposals.length + acceptedProposals.length;
  const conversionRate = totalProposals > 0
    ? (acceptedProposals.length / totalProposals) * 100
    : 0;

  const countByStatus = (status: string) =>
    relationshipEntities.filter((entity) => entity.relationship_status === status).length;

  const pipelineStages: HqPipelineStage[] = [
    {
      name: "Inquiry",
      count: countByStatus("lead"),
      value: 0,
    },
    {
      name: "Discovery",
      count: countByStatus("prospect"),
      value: 0,
    },
    {
      name: "Pitch",
      count: sentProposals.length,
      value: pipelineValue,
    },
    {
      name: "Active",
      count: countByStatus("client"),
      value: 0,
    },
    {
      name: "Lost",
      count: countByStatus("past_client"),
      value: 0,
    },
  ];

  // ============================================================================
  // CALCULATE REVENUE TREND (last 6 months)
  // ============================================================================

  const revenueTrendData: RevenueTrendPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const monthlyMrr = activeSubscriptions
      .filter((s) => new Date(s.created_at) <= monthEnd)
      .reduce((sum, s) => sum + (Number(s.retainer_mrr_cents) || 0) / 100, 0);

    const monthlyOneTime = invoices
      .filter(
        (i) =>
          i.status === "paid" &&
          i.paid_at &&
          new Date(i.paid_at) >= monthStart &&
          new Date(i.paid_at) <= monthEnd
      )
      .reduce((sum, i) => sum + (Number(i.amount_cents) || 0) / 100, 0);

    revenueTrendData.push({
      month: getMonthName(monthStart),
      mrr: monthlyMrr,
      oneTime: monthlyOneTime,
      total: monthlyMrr + monthlyOneTime,
    });
  }

  // ============================================================================
  // CALCULATE BUSINESS HEALTH SCORE
  // ============================================================================

  // Revenue health (0-100): Based on MRR trend and revenue growth
  const revenueHealth = Math.min(100, Math.max(0, 50 + revenueTrend));

  // Client health (0-100): Based on healthy client ratio
  const totalActiveClients = activeClients.length;
  const clientHealth = totalActiveClients > 0
    ? (clientHealthDistribution.healthy / totalActiveClients) * 100
    : 50;

  // Delivery health (0-100): Based on on-time rate
  const deliveryHealth = onTimeRate;

  // Pipeline health (0-100): Based on conversion rate and pipeline value
  const pipelineHealth = Math.min(100, conversionRate * 2 + (pipelineClients.length > 0 ? 30 : 0));

  const overallHealth = Math.round(
    (revenueHealth * 0.3 + clientHealth * 0.25 + deliveryHealth * 0.25 + pipelineHealth * 0.2)
  );

  const healthScore: BusinessHealthScore = {
    overall: overallHealth,
    revenue: Math.round(revenueHealth),
    clients: Math.round(clientHealth),
    delivery: Math.round(deliveryHealth),
    pipeline: Math.round(pipelineHealth),
  };

  // ============================================================================
  // BUILD METRIC CARDS
  // ============================================================================

  const mrrCard: MetricCard = {
    title: "Monthly Recurring",
    value: formatCurrency(currentMrr),
    rawValue: currentMrr,
    badge: {
      value: revenueTrend >= 0 ? `+${revenueTrend.toFixed(0)}%` : `${revenueTrend.toFixed(0)}%`,
      trend: revenueTrend >= 0 ? "up" : "down",
    },
    context: {
      line1: `${activeSubscriptions.length} active retainers`,
      line2: `${formatCurrency(paidThisMonth)} collected this month`,
    },
  };

  const activeClientsCard: MetricCard = {
    title: "Active Clients",
    value: activeClients.length.toString(),
    rawValue: activeClients.length,
    badge: {
      value: clientHealthDistribution.atRisk > 0
        ? `${clientHealthDistribution.atRisk} at risk`
        : "All healthy",
      trend: clientHealthDistribution.atRisk > 0 ? "down" : "up",
    },
    context: {
      line1: `${clientHealthDistribution.healthy} healthy, ${clientHealthDistribution.warning} warning`,
      line2: `${relationshipEntities.length} total relationships`,
    },
  };

  const onTimeRateCard: MetricCard = {
    title: "On-Time Delivery",
    value: `${Math.round(onTimeRate)}%`,
    rawValue: onTimeRate,
    badge: {
      value: onTimeRate >= 80 ? "Great" : onTimeRate >= 60 ? "Good" : "Needs work",
      trend: onTimeRate >= 80 ? "up" : onTimeRate >= 60 ? "neutral" : "down",
    },
    context: {
      line1: `${onTimeMilestones} on time, ${lateMilestones} late`,
      line2: `${pendingMilestones.length} milestones pending`,
    },
  };

  const pipelineValueCard: MetricCard = {
    title: "Pipeline Value",
    value: formatCurrency(pipelineValue),
    rawValue: pipelineValue,
    badge: {
      value: `${Math.round(conversionRate)}% conversion`,
      trend: conversionRate >= 30 ? "up" : conversionRate >= 15 ? "neutral" : "down",
    },
    context: {
      line1: `${pipelineClients.length} leads in pipeline`,
      line2: `${sentProposals.length} proposals pending`,
    },
  };

  // ============================================================================
  // RETURN DATA
  // ============================================================================

  return {
    healthScore,
    metrics: {
      mrr: mrrCard,
      activeClients: activeClientsCard,
      onTimeRate: onTimeRateCard,
      pipelineValue: pipelineValueCard,
    },
    revenueTrend: revenueTrendData,
    clientHealth: clientHealthDistribution,
    deliveryPerformance,
    pipelineStages,
    generatedAt: now.toISOString(),
  };
}
