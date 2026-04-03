"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type {
  StudioDashboardData,
  MetricCard,
  ActionItem,
  RecentWin,
} from "./types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface ClientHealthData {
  healthy: number;
  warning: number;
  atRisk: number;
  total: number;
  topClients: Array<{
    id: string;
    name: string;
    value: number;
  }>;
}

export interface ClientsDashboardData {
  metrics: {
    activeClients: MetricCard;
    totalValue: MetricCard;
    avgRevenue: MetricCard;
    atRiskClients: MetricCard;
  };
  healthData: ClientHealthData;
  actionItems: ActionItem[];
  recentWins: RecentWin[];
  generatedAt: string;
}

export async function getClientsDashboardData(): Promise<ClientsDashboardData> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  // Fetch all data in parallel
  const [clientsResult, invoicesResult, recentClientsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, lifecycle_stage, updated_at, created_at")
      .eq("studio_id", studio.id)
      .not("lifecycle_stage", "eq", "archived"),
    supabase
      .from("bridge_invoices")
      .select("amount_cents, client_id, status, paid_at, due_date")
      .eq("studio_id", studio.id),
    supabase
      .from("clients")
      .select("id, name, created_at")
      .eq("studio_id", studio.id)
      .eq("lifecycle_stage", "client")
      .gte("created_at", fourteenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const clients = clientsResult.data || [];
  const invoices = invoicesResult.data || [];
  const recentClients = recentClientsResult.data || [];

  // Calculate active clients
  const activeClients = clients.filter((c) => c.lifecycle_stage === "client");
  const activeCount = activeClients.length;

  // Calculate client health based on activity
  const clientHealth = activeClients.reduce(
    (acc, client) => {
      const lastActivity = new Date(client.updated_at);
      const daysSinceActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActivity <= 14) {
        acc.healthy++;
      } else if (daysSinceActivity <= 30) {
        acc.warning++;
      } else {
        acc.atRisk++;
      }
      return acc;
    },
    { healthy: 0, warning: 0, atRisk: 0 }
  );

  // Calculate revenue per client
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const clientRevenue = new Map<string, number>();

  for (const inv of paidInvoices) {
    if (inv.client_id) {
      const current = clientRevenue.get(inv.client_id) || 0;
      clientRevenue.set(inv.client_id, current + (inv.amount_cents || 0) / 100);
    }
  }

  const totalValue = Array.from(clientRevenue.values()).reduce((a, b) => a + b, 0);
  const avgRevenue = activeCount > 0 ? totalValue / activeCount : 0;

  // Get top clients by value
  const topClients = Array.from(clientRevenue.entries())
    .map(([clientId, value]) => {
      const client = clients.find((c) => c.id === clientId);
      return {
        id: clientId,
        name: client?.name || "Unknown",
        value,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Calculate month-over-month change for active clients
  const lastMonthClients = activeClients.filter((c) => {
    const created = new Date(c.created_at);
    return created < thirtyDaysAgo;
  }).length;
  const newThisMonth = activeCount - lastMonthClients;

  // Build metric cards
  const activeClientsCard: MetricCard = {
    title: "Active Clients",
    value: activeCount.toString(),
    rawValue: activeCount,
    badge: {
      value: newThisMonth > 0 ? `+${newThisMonth} this month` : "Stable",
      trend: newThisMonth > 0 ? "up" : "neutral",
    },
    context: {
      line1: activeCount > 0
        ? `${clientHealth.healthy} healthy, ${clientHealth.warning + clientHealth.atRisk} need attention`
        : "Add your first client",
      line2: "Based on recent activity",
    },
  };

  const totalValueCard: MetricCard = {
    title: "Total Client Value",
    value: formatCurrency(totalValue),
    rawValue: totalValue,
    badge: {
      value: "Lifetime",
      trend: "neutral",
    },
    context: {
      line1: `Across ${clientRevenue.size} clients`,
      line2: "From paid invoices",
    },
  };

  const avgRevenueCard: MetricCard = {
    title: "Avg Revenue/Client",
    value: formatCurrency(avgRevenue),
    rawValue: avgRevenue,
    badge: {
      value: activeCount > 0 ? "Per client" : "N/A",
      trend: "neutral",
    },
    context: {
      line1: activeCount > 0 ? "Average lifetime value" : "No clients yet",
      line2: totalValue > 0 ? `Top client: ${formatCurrency(topClients[0]?.value || 0)}` : "",
    },
  };

  const atRiskCard: MetricCard = {
    title: "At-Risk Clients",
    value: clientHealth.atRisk.toString(),
    rawValue: clientHealth.atRisk,
    badge: {
      value: clientHealth.atRisk > 0 ? "Need attention" : "All good",
      trend: clientHealth.atRisk > 0 ? "down" : "up",
    },
    context: {
      line1: clientHealth.atRisk > 0
        ? "No activity in 30+ days"
        : "All clients active recently",
      line2: clientHealth.warning > 0 ? `${clientHealth.warning} showing warning signs` : "",
    },
  };

  // Build action items (client-focused)
  const actionItems: ActionItem[] = [];

  // Add at-risk clients as action items
  for (const client of activeClients) {
    const lastActivity = new Date(client.updated_at);
    const daysSinceActivity = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceActivity > 30) {
      actionItems.push({
        id: `client-${client.id}`,
        type: "lead",
        title: client.name,
        subtitle: `No activity in ${daysSinceActivity} days`,
        status: "stale",
        daysInStage: daysSinceActivity,
        href: `/clients/${client.id}`,
      });
    }
  }

  // Add overdue invoices
  for (const inv of invoices) {
    if (inv.status === "sent" || inv.status === "overdue") {
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      const daysOverdue = dueDate
        ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysOverdue > 0) {
        const client = clients.find((c) => c.id === inv.client_id);
        actionItems.push({
          id: `invoice-${inv.client_id}-${daysOverdue}`,
          type: "invoice",
          title: formatCurrency((inv.amount_cents || 0) / 100),
          subtitle: client?.name || "Client",
          status: "overdue",
          amount: (inv.amount_cents || 0) / 100,
          dueDate: dueDate || undefined,
          daysOverdue,
          href: `/clients/${inv.client_id}`,
        });
      }
    }
  }

  // Sort by priority
  actionItems.sort((a, b) => {
    const priority = { overdue: 0, due_soon: 1, stale: 2, pending: 3 };
    return priority[a.status] - priority[b.status];
  });

  // Build recent wins (client-focused)
  const recentWins: RecentWin[] = [];

  // New clients
  for (const client of recentClients) {
    recentWins.push({
      id: `client-${client.id}`,
      type: "new_client",
      title: "New client",
      subtitle: client.name,
      timestamp: new Date(client.created_at),
      href: `/clients/${client.id}`,
    });
  }

  // Recent paid invoices
  const recentPaidInvoices = paidInvoices
    .filter((i) => i.paid_at && new Date(i.paid_at) >= fourteenDaysAgo)
    .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())
    .slice(0, 5);

  for (const inv of recentPaidInvoices) {
    const client = clients.find((c) => c.id === inv.client_id);
    recentWins.push({
      id: `invoice-${inv.client_id}-${inv.paid_at}`,
      type: "invoice_paid",
      title: `${formatCurrency((inv.amount_cents || 0) / 100)} paid`,
      subtitle: client?.name || "Client",
      amount: (inv.amount_cents || 0) / 100,
      timestamp: new Date(inv.paid_at!),
      href: `/clients/${inv.client_id}`,
    });
  }

  // Sort by timestamp
  recentWins.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    metrics: {
      activeClients: activeClientsCard,
      totalValue: totalValueCard,
      avgRevenue: avgRevenueCard,
      atRiskClients: atRiskCard,
    },
    healthData: {
      healthy: clientHealth.healthy,
      warning: clientHealth.warning,
      atRisk: clientHealth.atRisk,
      total: activeCount,
      topClients,
    },
    actionItems: actionItems.slice(0, 10),
    recentWins: recentWins.slice(0, 5),
    generatedAt: now.toISOString(),
  };
}
