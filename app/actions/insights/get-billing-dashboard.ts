"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type {
  MetricCard,
  ActionItem,
  RecentWin,
  RevenueChartPoint,
} from "./types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface BillingDashboardData {
  metrics: {
    mrr: MetricCard;
    outstanding: MetricCard;
    collectedMtd: MetricCard;
    overdueAmount: MetricCard;
  };
  revenueChart: RevenueChartPoint[];
  actionItems: ActionItem[];
  recentWins: RecentWin[];
  generatedAt: string;
}

export async function getBillingDashboardData(): Promise<BillingDashboardData> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  // Fetch all data in parallel
  const [subscriptionsResult, invoicesResult, revenueChart] = await Promise.all([
    supabase
      .from("portal_client_subscriptions")
      .select("amount_cents, status")
      .eq("studio_id", studio.id)
      .in("status", ["active", "trialing"]),
    supabase
      .from("portal_invoices")
      .select("id, amount_cents, status, paid_at, due_date, client_id, clients(id, name)")
      .eq("studio_id", studio.id),
    getDailyRevenueData(supabase, studio.id, now),
  ]);

  const subscriptions = subscriptionsResult.data || [];
  const invoices = invoicesResult.data || [];

  // Calculate MRR
  const mrr = subscriptions.reduce(
    (sum, sub) => sum + (sub.amount_cents || 0) / 100,
    0
  );

  // Calculate outstanding (unpaid invoices)
  const unpaidInvoices = invoices.filter(
    (inv) => inv.status === "sent" || inv.status === "pending"
  );
  const outstanding = unpaidInvoices.reduce(
    (sum, inv) => sum + (inv.amount_cents || 0) / 100,
    0
  );

  // Calculate overdue amount
  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status === "paid") return false;
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < now;
  });
  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + (inv.amount_cents || 0) / 100,
    0
  );

  // Calculate collected this month
  const paidThisMonth = invoices.filter((inv) => {
    if (inv.status !== "paid" || !inv.paid_at) return false;
    return new Date(inv.paid_at) >= startOfMonth;
  });
  const collectedMtd = paidThisMonth.reduce(
    (sum, inv) => sum + (inv.amount_cents || 0) / 100,
    0
  );

  // Build metric cards
  const mrrCard: MetricCard = {
    title: "Monthly Recurring",
    value: formatCurrency(mrr),
    rawValue: mrr,
    badge: {
      value: subscriptions.length > 0 ? `${subscriptions.length} active` : "No retainers",
      trend: subscriptions.length > 0 ? "up" : "neutral",
    },
    context: {
      line1: mrr > 0 ? "From active retainers" : "No recurring revenue yet",
      line2: subscriptions.length > 0 ? `${subscriptions.length} retainer${subscriptions.length === 1 ? "" : "s"}` : "",
    },
  };

  const outstandingCard: MetricCard = {
    title: "Outstanding",
    value: formatCurrency(outstanding),
    rawValue: outstanding,
    badge: {
      value: unpaidInvoices.length > 0 ? `${unpaidInvoices.length} invoices` : "All clear",
      trend: outstanding > 0 ? "down" : "up",
    },
    context: {
      line1: outstanding > 0 ? "Awaiting payment" : "No pending invoices",
      line2: overdueAmount > 0 ? `${formatCurrency(overdueAmount)} overdue` : "",
    },
  };

  const collectedCard: MetricCard = {
    title: "Collected (MTD)",
    value: formatCurrency(collectedMtd),
    rawValue: collectedMtd,
    badge: {
      value: paidThisMonth.length > 0 ? `${paidThisMonth.length} payments` : "No payments",
      trend: collectedMtd > 0 ? "up" : "neutral",
    },
    context: {
      line1: `This month so far`,
      line2: paidThisMonth.length > 0 ? `${paidThisMonth.length} invoice${paidThisMonth.length === 1 ? "" : "s"} paid` : "",
    },
  };

  const overdueCard: MetricCard = {
    title: "Overdue",
    value: formatCurrency(overdueAmount),
    rawValue: overdueAmount,
    badge: {
      value: overdueInvoices.length > 0 ? `${overdueInvoices.length} invoices` : "None",
      trend: overdueAmount > 0 ? "down" : "up",
    },
    context: {
      line1: overdueAmount > 0 ? "Needs follow-up" : "All invoices on time",
      line2: overdueInvoices.length > 0 ? "Send payment reminders" : "",
    },
  };

  // Build action items (billing-focused)
  const actionItems: ActionItem[] = [];

  for (const inv of invoices) {
    if (inv.status === "paid") continue;

    const client = inv.clients as unknown as { id: string; name: string } | null;
    const dueDate = inv.due_date ? new Date(inv.due_date) : null;
    const daysOverdue = dueDate
      ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let status: ActionItem["status"] = "pending";
    if (daysOverdue > 0) status = "overdue";
    else if (daysOverdue >= -7) status = "due_soon";

    if (status === "overdue" || status === "due_soon") {
      actionItems.push({
        id: `invoice-${inv.id}`,
        type: "invoice",
        title: formatCurrency((inv.amount_cents || 0) / 100),
        subtitle: client?.name || "Client",
        status,
        amount: (inv.amount_cents || 0) / 100,
        dueDate: dueDate || undefined,
        daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
        href: `/billing/invoices/${inv.id}`,
      });
    }
  }

  // Sort by priority
  actionItems.sort((a, b) => {
    const priority = { overdue: 0, due_soon: 1, stale: 2, pending: 3 };
    return priority[a.status] - priority[b.status];
  });

  // Build recent wins (payments received)
  const recentWins: RecentWin[] = [];

  const recentPayments = invoices
    .filter((inv) => inv.status === "paid" && inv.paid_at && new Date(inv.paid_at) >= fourteenDaysAgo)
    .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())
    .slice(0, 5);

  for (const inv of recentPayments) {
    const client = inv.clients as unknown as { id: string; name: string } | null;
    recentWins.push({
      id: `invoice-${inv.id}`,
      type: "invoice_paid",
      title: `${formatCurrency((inv.amount_cents || 0) / 100)} received`,
      subtitle: client?.name || "Client",
      amount: (inv.amount_cents || 0) / 100,
      timestamp: new Date(inv.paid_at!),
      href: `/billing/invoices/${inv.id}`,
    });
  }

  return {
    metrics: {
      mrr: mrrCard,
      outstanding: outstandingCard,
      collectedMtd: collectedCard,
      overdueAmount: overdueCard,
    },
    revenueChart,
    actionItems: actionItems.slice(0, 10),
    recentWins,
    generatedAt: now.toISOString(),
  };
}

// Re-export the helper for the revenue chart
async function getDailyRevenueData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string,
  now: Date
): Promise<RevenueChartPoint[]> {
  const dailyData: Map<string, { recurring: number; oneTime: number }> = new Map();

  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(now.getDate() - daysAgo);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    dailyData.set(dateKey, { recurring: 0, oneTime: 0 });
  }

  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 89);

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

  for (const sub of subscriptionsResult) {
    const dailyMrr = ((sub.amount_cents || 0) / 100) / 30;
    dailyData.forEach((value) => {
      value.recurring += dailyMrr;
    });
  }

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
