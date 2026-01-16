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

  // Get current MRR from active subscriptions
  let mrr = 0;
  try {
    const { data: subscriptions } = await supabase
      .from("bridge_client_subscriptions")
      .select("amount_cents")
      .eq("studio_id", studio.id)
      .in("status", ["active", "trialing"]);

    mrr = (subscriptions || []).reduce(
      (sum, sub) => sum + (sub.amount_cents || 0),
      0
    ) / 100; // Convert cents to dollars
  } catch (e) {
    console.warn("Error fetching subscriptions for revenue analytics:", e);
  }

  // Get one-time revenue this month and quarter
  let oneTimeThisMonth = 0;
  let oneTimeThisQuarter = 0;
  try {
    const { data: invoicesMonth } = await supabase
      .from("bridge_invoices")
      .select("amount_cents")
      .eq("studio_id", studio.id)
      .eq("status", "paid")
      .gte("paid_at", firstDayThisMonth.toISOString());

    oneTimeThisMonth = (invoicesMonth || []).reduce(
      (sum, inv) => sum + (inv.amount_cents || 0),
      0
    ) / 100;

    const { data: invoicesQuarter } = await supabase
      .from("bridge_invoices")
      .select("amount_cents")
      .eq("studio_id", studio.id)
      .eq("status", "paid")
      .gte("paid_at", firstDayThisQuarter.toISOString());

    oneTimeThisQuarter = (invoicesQuarter || []).reduce(
      (sum, inv) => sum + (inv.amount_cents || 0),
      0
    ) / 100;
  } catch (e) {
    console.warn("Error fetching invoices for revenue analytics:", e);
  }

  // Get 12-month revenue trend
  const revenueByMonth: Array<{
    month: string;
    mrr: number;
    oneTime: number;
    total: number;
  }> = [];

  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(now.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(twelveMonthsAgo);
    monthStart.setMonth(twelveMonthsAgo.getMonth() + i);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthStart.getMonth() + 1);

    const monthStr = monthStart.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    try {
      // Get subscriptions active during this month
      const { data: monthSubs } = await supabase
        .from("bridge_client_subscriptions")
        .select("amount_cents")
        .eq("studio_id", studio.id)
        .in("status", ["active", "trialing"])
        .lte("current_period_start", monthEnd.toISOString())
        .or(
          `current_period_end.is.null,current_period_end.gte.${monthStart.toISOString()}`
        );

      const monthMrr =
        (monthSubs || []).reduce(
          (sum, sub) => sum + (sub.amount_cents || 0),
          0
        ) / 100;

      // Get one-time invoices paid this month
      const { data: monthInvoices } = await supabase
        .from("bridge_invoices")
        .select("amount_cents")
        .eq("studio_id", studio.id)
        .eq("status", "paid")
        .gte("paid_at", monthStart.toISOString())
        .lt("paid_at", monthEnd.toISOString());

      const monthOneTime =
        (monthInvoices || []).reduce(
          (sum, inv) => sum + (inv.amount_cents || 0),
          0
        ) / 100;

      revenueByMonth.push({
        month: monthStr,
        mrr: monthMrr,
        oneTime: monthOneTime,
        total: monthMrr + monthOneTime,
      });
    } catch (e) {
      console.warn(`Error fetching revenue for month ${monthStr}:`, e);
      revenueByMonth.push({
        month: monthStr,
        mrr: 0,
        oneTime: 0,
        total: 0,
      });
    }
  }

  // Simple forecast: assume MRR continues + estimate one-time based on average
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

