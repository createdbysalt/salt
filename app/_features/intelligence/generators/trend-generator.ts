/**
 * Trend Insight Generator
 *
 * Generates trend insights with sparkline data from real database records.
 * All trends are computed from actual historical data.
 */

import { createClient } from "@/app/_lib/supabase/server";
import type {
  TrendInsight,
  DataSource,
  InsightSentiment,
} from "../types/ambient-intelligence";

// ============================================================================
// Revenue Trend Generator
// ============================================================================

/**
 * Generate MRR trend insight
 * Data comes from: bridge_client_subscriptions
 */
export async function generateMRRTrendInsight(
  studioId: string
): Promise<TrendInsight | null> {
  try {
    const supabase = await createClient();
    const now = new Date();

    // Get current MRR from active subscriptions
    const { data: currentSubs } = await supabase
      .from("bridge_client_subscriptions")
      .select("amount_cents")
      .eq("studio_id", studioId)
      .in("status", ["active", "trialing"]);

    const currentMRR =
      (currentSubs || []).reduce(
        (sum, sub) => sum + (sub.amount_cents || 0),
        0
      ) / 100;

    // Get historical MRR (last 6 months for sparkline)
    const sparklineData: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(now.getMonth() - i);
      monthDate.setDate(1);

      // For historical MRR, we'd need subscription history
      // For now, approximate with paid invoices that month
      const monthEnd = new Date(monthDate);
      monthEnd.setMonth(monthDate.getMonth() + 1);

      const { data: monthInvoices } = await supabase
        .from("bridge_invoices")
        .select("amount_cents")
        .eq("studio_id", studioId)
        .eq("status", "paid")
        .gte("paid_at", monthDate.toISOString())
        .lt("paid_at", monthEnd.toISOString());

      const monthTotal =
        (monthInvoices || []).reduce(
          (sum, inv) => sum + (inv.amount_cents || 0),
          0
        ) / 100;
      sparklineData.push(monthTotal);
    }

    // Calculate trend
    const lastMonth = sparklineData[sparklineData.length - 2] || 0;
    const changeAbsolute = currentMRR - lastMonth;
    const changePercent =
      lastMonth > 0 ? Math.round((changeAbsolute / lastMonth) * 100) : 0;

    const direction: "up" | "down" | "stable" =
      changePercent > 5 ? "up" : changePercent < -5 ? "down" : "stable";

    const sentiment: InsightSentiment =
      direction === "up"
        ? "positive"
        : direction === "down"
          ? "negative"
          : "neutral";

    const dataSource: DataSource = {
      table: "bridge_client_subscriptions, bridge_invoices",
      computation: `SUM(amount_cents) WHERE status IN ('active', 'trialing')`,
      computedAt: now,
    };

    // Format value
    const formattedValue =
      currentMRR >= 1000
        ? `$${(currentMRR / 1000).toFixed(1)}k`
        : `$${currentMRR.toFixed(0)}`;

    return {
      id: `trend-mrr-${studioId}-${now.getTime()}`,
      category: "trend",
      sentiment,
      priority: 8,
      generatedAt: now,
      metric: {
        label: "Monthly Revenue",
        value: currentMRR,
        unit: "USD",
        formattedValue,
        dataSource,
      },
      trend: {
        direction,
        changePercent,
        changeAbsolute,
        period: "vs last month",
        sparklineData,
      },
      meaning: {
        plainEnglish:
          direction === "up"
            ? `Revenue is up ${changePercent}% from last month.`
            : direction === "down"
              ? `Revenue is down ${Math.abs(changePercent)}% from last month.`
              : "Revenue is stable compared to last month.",
        whyItMatters:
          "Consistent revenue growth indicates a healthy business with good client retention.",
        benchmark:
          lastMonth > 0
            ? {
                value: lastMonth,
                source: "time_comparison",
                label: "Last month",
                comparison:
                  changePercent > 0
                    ? "above"
                    : changePercent < 0
                      ? "below"
                      : "at",
              }
            : undefined,
      },
      action:
        direction === "down"
          ? {
              label: "View revenue breakdown",
              href: "/studio/insights",
              urgency: "medium",
              icon: "BarChart3",
            }
          : undefined,
    };
  } catch (error) {
    console.error("Error generating MRR trend insight:", error);
    return null;
  }
}

/**
 * Generate client count trend insight
 * Data comes from: clients table
 */
export async function generateClientCountTrendInsight(
  studioId: string
): Promise<TrendInsight | null> {
  try {
    const supabase = await createClient();
    const now = new Date();

    // Get current active client count
    const { data: clients, count } = await supabase
      .from("clients")
      .select("id, created_at", { count: "exact" })
      .eq("studio_id", studioId)
      .is("archived_at", null);

    const currentCount = count || 0;

    // Build sparkline from client creation dates (last 6 months)
    const sparklineData: number[] = [];
    let runningCount = 0;

    // Count clients created before 6 months ago
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const clientsBefore = (clients || []).filter(
      (c) => new Date(c.created_at) < sixMonthsAgo
    );
    runningCount = clientsBefore.length;

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now);
      monthStart.setMonth(now.getMonth() - i);
      monthStart.setDate(1);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthStart.getMonth() + 1);

      const newClientsThisMonth = (clients || []).filter((c) => {
        const createdAt = new Date(c.created_at);
        return createdAt >= monthStart && createdAt < monthEnd;
      }).length;

      runningCount += newClientsThisMonth;
      sparklineData.push(runningCount);
    }

    // Calculate trend
    const lastMonthCount = sparklineData[sparklineData.length - 2] || 0;
    const changeAbsolute = currentCount - lastMonthCount;
    const changePercent =
      lastMonthCount > 0
        ? Math.round((changeAbsolute / lastMonthCount) * 100)
        : 0;

    const direction: "up" | "down" | "stable" =
      changeAbsolute > 0 ? "up" : changeAbsolute < 0 ? "down" : "stable";

    const sentiment: InsightSentiment =
      direction === "up"
        ? "positive"
        : direction === "down"
          ? "negative"
          : "neutral";

    const dataSource: DataSource = {
      table: "clients",
      computation: `COUNT(*) WHERE studio_id = '${studioId}' AND archived_at IS NULL`,
      computedAt: now,
    };

    return {
      id: `trend-clients-${studioId}-${now.getTime()}`,
      category: "trend",
      sentiment,
      priority: 6,
      generatedAt: now,
      metric: {
        label: "Total Clients",
        value: currentCount,
        formattedValue: currentCount.toString(),
        dataSource,
      },
      trend: {
        direction,
        changePercent,
        changeAbsolute,
        period: "vs last month",
        sparklineData,
      },
      meaning: {
        plainEnglish:
          changeAbsolute > 0
            ? `You've added ${changeAbsolute} new client${changeAbsolute > 1 ? "s" : ""} this month.`
            : changeAbsolute < 0
              ? `Client count decreased by ${Math.abs(changeAbsolute)} this month.`
              : "Client count is stable this month.",
        whyItMatters:
          "A growing client base indicates strong demand for your services.",
      },
      action:
        changeAbsolute <= 0
          ? {
              label: "Add new client",
              href: "/studio/clients/new",
              urgency: "low",
              icon: "UserPlus",
            }
          : undefined,
    };
  } catch (error) {
    console.error("Error generating client count trend insight:", error);
    return null;
  }
}

/**
 * Generate LTV trend insight for a specific client
 * Data comes from: bridge_invoices
 */
export async function generateClientLTVInsight(
  clientId: string
): Promise<TrendInsight | null> {
  try {
    const supabase = await createClient();
    const now = new Date();

    // Get all paid invoices for this client
    const { data: invoices } = await supabase
      .from("bridge_invoices")
      .select("amount_cents, paid_at")
      .eq("client_id", clientId)
      .eq("status", "paid")
      .order("paid_at", { ascending: true });

    if (!invoices || invoices.length === 0) return null;

    // Calculate total LTV
    const totalLTV =
      invoices.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;

    // Build sparkline (cumulative LTV over last 6 months)
    const sparklineData: number[] = [];
    let cumulativeLTV = 0;

    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(now);
      monthEnd.setMonth(now.getMonth() - i + 1);
      monthEnd.setDate(0); // Last day of previous month

      const invoicesUpToMonth = invoices.filter(
        (inv) => new Date(inv.paid_at) <= monthEnd
      );

      cumulativeLTV =
        invoicesUpToMonth.reduce(
          (sum, inv) => sum + (inv.amount_cents || 0),
          0
        ) / 100;
      sparklineData.push(cumulativeLTV);
    }

    // Calculate recent change
    const lastMonth = sparklineData[sparklineData.length - 2] || 0;
    const changeAbsolute = totalLTV - lastMonth;
    const changePercent =
      lastMonth > 0 ? Math.round((changeAbsolute / lastMonth) * 100) : 0;

    const direction: "up" | "down" | "stable" =
      changeAbsolute > 0 ? "up" : changeAbsolute < 0 ? "down" : "stable";

    const sentiment: InsightSentiment =
      direction === "up" ? "positive" : "neutral";

    const dataSource: DataSource = {
      table: "bridge_invoices",
      computation: `SUM(amount_cents) WHERE client_id = '${clientId}' AND status = 'paid'`,
      computedAt: now,
      entityIds: [clientId],
    };

    const formattedValue =
      totalLTV >= 1000
        ? `$${(totalLTV / 1000).toFixed(1)}k`
        : `$${totalLTV.toFixed(0)}`;

    return {
      id: `trend-ltv-${clientId}-${now.getTime()}`,
      category: "trend",
      sentiment,
      priority: 5,
      generatedAt: now,
      metric: {
        label: "Lifetime Value",
        value: totalLTV,
        unit: "USD",
        formattedValue,
        dataSource,
      },
      trend: {
        direction,
        changePercent,
        changeAbsolute,
        period: "this month",
        sparklineData,
      },
      meaning: {
        plainEnglish: `This client has contributed ${formattedValue} in total revenue.`,
        whyItMatters:
          "Lifetime value helps prioritize high-value relationships.",
      },
    };
  } catch (error) {
    console.error("Error generating client LTV insight:", error);
    return null;
  }
}
