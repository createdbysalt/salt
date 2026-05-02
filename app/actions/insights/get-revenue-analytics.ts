"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type { RevenueAnalytics } from "./types";

/**
 * Calculate revenue analytics from existing Bridge billing tables
 * - MRR from active/trialing subscriptions
 * - One-time revenue from paid invoices
 * - 12-month revenue trend
 * - Simple forecast based on current MRR + pipeline
 *
 * OPTIMIZED: Previously 24+ sequential queries, now 2 batch queries
 */
export async function getRevenueAnalytics(): Promise<RevenueAnalytics> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayThisQuarter = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1
  );

  // Calculate 12-month window
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(now.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  // ============================================================================
  // Batch fetch ALL data in parallel (2 queries instead of 24+)
  // ============================================================================
  const [subscriptionsResult, invoicesResult] = await Promise.all([
    // All active/trialing subscriptions with period dates
    supabase
      .from("portal_client_subscriptions")
      .select("amount_cents, current_period_start, current_period_end, status")
      .eq("studio_id", studio.id)
      .in("status", ["active", "trialing"]),

    // All paid invoices in the 12-month window
    supabase
      .from("portal_invoices")
      .select("amount_cents, paid_at")
      .eq("studio_id", studio.id)
      .eq("status", "paid")
      .gte("paid_at", twelveMonthsAgo.toISOString()),
  ]);

  const subscriptions = subscriptionsResult.data || [];
  const invoices = invoicesResult.data || [];

  // ============================================================================
  // Calculate current MRR
  // ============================================================================
  const mrr = subscriptions.reduce(
    (sum, sub) => sum + (sub.amount_cents || 0),
    0
  ) / 100;

  // ============================================================================
  // Calculate one-time revenue (this month and quarter)
  // ============================================================================
  let oneTimeThisMonth = 0;
  let oneTimeThisQuarter = 0;

  for (const inv of invoices) {
    const paidAt = new Date(inv.paid_at);
    const amount = (inv.amount_cents || 0) / 100;

    if (paidAt >= firstDayThisMonth) {
      oneTimeThisMonth += amount;
    }
    if (paidAt >= firstDayThisQuarter) {
      oneTimeThisQuarter += amount;
    }
  }

  // ============================================================================
  // Calculate 12-month revenue trend (in memory, no additional queries)
  // ============================================================================
  const revenueByMonth: Array<{
    month: string;
    mrr: number;
    oneTime: number;
    total: number;
  }> = [];

  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(twelveMonthsAgo);
    monthStart.setMonth(twelveMonthsAgo.getMonth() + i);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthStart.getMonth() + 1);

    const monthStr = monthStart.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    // Calculate MRR for this month (subscriptions active during the month)
    const monthMrr = subscriptions
      .filter((sub) => {
        const periodStart = sub.current_period_start
          ? new Date(sub.current_period_start)
          : new Date(0);
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end)
          : new Date(9999, 11, 31);
        // Subscription is active if period overlaps with month
        return periodStart <= monthEnd && periodEnd >= monthStart;
      })
      .reduce((sum, sub) => sum + (sub.amount_cents || 0), 0) / 100;

    // Calculate one-time revenue for this month
    const monthOneTime = invoices
      .filter((inv) => {
        const paidAt = new Date(inv.paid_at);
        return paidAt >= monthStart && paidAt < monthEnd;
      })
      .reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;

    revenueByMonth.push({
      month: monthStr,
      mrr: monthMrr,
      oneTime: monthOneTime,
      total: monthMrr + monthOneTime,
    });
  }

  // ============================================================================
  // Simple forecast
  // ============================================================================
  const avgOneTimePerMonth =
    revenueByMonth.length > 0
      ? revenueByMonth.reduce((sum, m) => sum + m.oneTime, 0) /
        revenueByMonth.length
      : 0;

  return {
    mrr,
    oneTimeThisMonth,
    oneTimeThisQuarter,
    revenueByMonth,
    forecast: {
      nextMonth: mrr + avgOneTimePerMonth,
      nextQuarter: mrr * 3 + avgOneTimePerMonth * 3,
    },
  };
}

