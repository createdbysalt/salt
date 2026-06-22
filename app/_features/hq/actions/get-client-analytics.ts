"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { calculateClientHealthScore } from "@/app/_features/people/actions/clients/calculate-health-score";
import type { ClientAnalytics, GrowthOpportunities, ChurnRisk } from "./types";

/**
 * Calculate client-focused analytics:
 * - Health score distribution
 * - Last contact distribution
 * - Average LTV and lifespan
 * - Growth opportunities (clients without retainers)
 * - Churn risk (low health scores, expiring retainers)
 */
export async function getClientAnalytics(): Promise<{
  analytics: ClientAnalytics;
  growth: GrowthOpportunities;
  churn: ChurnRisk;
}> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  // Get all active clients with basic info
  const { data: clients } = await supabase
    .from("clients")
    .select(
      `
      id,
      name,
      created_at,
      last_contact_at,
      status,
      settings
    `
    )
    .eq("studio_id", studio.id)
    .is("archived_at", null);

  const activeClients = (clients || []).filter(
    (c) => (c.status || c.settings?.status || "active") === "active"
  );

  // Initialize distributions
  const healthDistribution = { healthy: 0, warning: 0, atRisk: 0 };
  const lastContactDistribution = {
    last7days: 0,
    last30days: 0,
    last90days: 0,
    over90days: 0,
  };

  const now = new Date();
  const clientsWithHealth: Array<{
    id: string;
    name: string;
    healthScore: number;
    mrr: number;
  }> = [];

  // Calculate health scores and distributions
  for (const client of activeClients) {
    try {
      const healthResult = await calculateClientHealthScore(client.id);
      const healthScore = healthResult.score;

      // Health distribution
      if (healthScore >= 80) healthDistribution.healthy++;
      else if (healthScore >= 50) healthDistribution.warning++;
      else healthDistribution.atRisk++;

      // Last contact distribution
      const lastContact = client.last_contact_at || client.settings?.lastContact;
      if (lastContact) {
        const lastContactDate = new Date(lastContact);
        const daysSince = Math.floor(
          (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSince <= 7) lastContactDistribution.last7days++;
        else if (daysSince <= 30) lastContactDistribution.last30days++;
        else if (daysSince <= 90) lastContactDistribution.last90days++;
        else lastContactDistribution.over90days++;
      } else {
        lastContactDistribution.over90days++;
      }

      // Get MRR for this client
      let clientMrr = 0;
      try {
        const { data: subs } = await supabase
          .from("portal_client_subscriptions")
          .select("amount_cents")
          .eq("client_id", client.id)
          .in("status", ["active", "trialing"]);

        clientMrr =
          (subs || []).reduce((sum, sub) => sum + (sub.amount_cents || 0), 0) /
          100;
      } catch (e) {
        // Table might not exist yet
      }

      clientsWithHealth.push({
        id: client.id,
        name: client.name,
        healthScore,
        mrr: clientMrr,
      });
    } catch (e) {
      console.warn(`Error calculating health for client ${client.id}:`, e);
    }
  }

  // Calculate average LTV and lifespan
  let totalLtv = 0;
  let totalLifespanMonths = 0;
  let clientsWithInvoices = 0;

  for (const client of activeClients) {
    try {
      const { data: invoices } = await supabase
        .from("portal_invoices")
        .select("amount_cents")
        .eq("client_id", client.id)
        .eq("status", "paid");

      if (invoices && invoices.length > 0) {
        const ltv =
          invoices.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;
        totalLtv += ltv;
        clientsWithInvoices++;

        // Calculate lifespan
        const createdAt = new Date(client.created_at);
        const monthsSince =
          (now.getFullYear() - createdAt.getFullYear()) * 12 +
          (now.getMonth() - createdAt.getMonth());
        totalLifespanMonths += Math.max(monthsSince, 1);
      }
    } catch (e) {
      // Table might not exist yet
    }
  }

  const averageLtv =
    clientsWithInvoices > 0 ? totalLtv / clientsWithInvoices : 0;
  const averageLifespanMonths =
    clientsWithInvoices > 0 ? totalLifespanMonths / clientsWithInvoices : 0;

  // Simple churn rate: clients lost in last month / total at start of month
  // For Phase 1, we'll approximate with inactive clients
  const { data: inactiveClients } = await supabase
    .from("clients")
    .select("id")
    .eq("studio_id", studio.id)
    .eq("status", "inactive");

  const monthlyChurnRate =
    activeClients.length > 0
      ? ((inactiveClients?.length || 0) /
          (activeClients.length + (inactiveClients?.length || 0))) *
        100
      : 0;

  // Growth opportunities: Clients without retainers
  const clientsWithoutRetainers: Array<{
    id: string;
    name: string;
    ltv: number;
    lastProjectValue: number | null;
  }> = [];

  for (const client of activeClients) {
    try {
      const { data: subs } = await supabase
        .from("portal_client_subscriptions")
        .select("id")
        .eq("client_id", client.id)
        .in("status", ["active", "trialing"])
        .limit(1);

      if (!subs || subs.length === 0) {
        // No retainer, get their LTV
        const { data: invoices } = await supabase
          .from("portal_invoices")
          .select("amount_cents")
          .eq("client_id", client.id)
          .eq("status", "paid")
          .order("paid_at", { ascending: false });

        const ltv =
          (invoices || []).reduce(
            (sum, inv) => sum + (inv.amount_cents || 0),
            0
          ) / 100;
        const lastProjectValue =
          invoices && invoices.length > 0 ? invoices[0].amount_cents / 100 : null;

        clientsWithoutRetainers.push({
          id: client.id,
          name: client.name,
          ltv,
          lastProjectValue,
        });
      }
    } catch (e) {
      // Table might not exist yet
    }
  }

  // Sort by LTV (best upsell targets first)
  clientsWithoutRetainers.sort((a, b) => b.ltv - a.ltv);

  // Average project value trend (simple: last 6 months)
  const avgProjectValueTrend: Array<{ period: string; avgValue: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - i);
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthStart.getMonth() + 1);

    const monthStr = monthStart.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    try {
      const { data: invoices } = await supabase
        .from("portal_invoices")
        .select("amount_cents")
        .eq("studio_id", studio.id)
        .eq("status", "paid")
        .gte("paid_at", monthStart.toISOString())
        .lt("paid_at", monthEnd.toISOString());

      const avgValue =
        invoices && invoices.length > 0
          ? invoices.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) /
            invoices.length /
            100
          : 0;

      avgProjectValueTrend.push({ period: monthStr, avgValue });
    } catch (e) {
      avgProjectValueTrend.push({ period: monthStr, avgValue: 0 });
    }
  }

  // Churn risk: at-risk clients + expiring retainers
  const atRiskClients = clientsWithHealth
    .filter((c) => c.healthScore < 70)
    .map((c) => ({
      ...c,
      reason:
        c.healthScore < 50
          ? "Critical: Very low health score"
          : "Warning: Low health score",
    }))
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 10); // Top 10 most at risk

  // Expiring retainers (30/60/90 days)
  const expiringRetainers: Array<{
    clientId: string;
    clientName: string;
    projectId: string;
    projectName: string;
    expiresAt: string;
    mrr: number;
    daysRemaining: number;
  }> = [];

  const ninetyDaysFromNow = new Date(now);
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  try {
    const { data: subscriptions } = await supabase
      .from("portal_client_subscriptions")
      .select(
        `
        id,
        client_id,
        project_id,
        amount_cents,
        current_period_end,
        clients!inner(id, name),
        projects(id, name)
      `
      )
      .eq("studio_id", studio.id)
      .in("status", ["active", "trialing"])
      .lte("current_period_end", ninetyDaysFromNow.toISOString())
      .order("current_period_end", { ascending: true });

    for (const sub of subscriptions || []) {
      const expiresAt = new Date(sub.current_period_end);
      const daysRemaining = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining >= 0) {
        expiringRetainers.push({
          clientId: sub.client_id,
          clientName: (sub as any).clients.name,
          projectId: sub.project_id || "",
          projectName: (sub as any).projects?.name || "Retainer",
          expiresAt: sub.current_period_end,
          mrr: sub.amount_cents / 100,
          daysRemaining,
        });
      }
    }
  } catch (e) {
    console.warn("Error fetching expiring retainers:", e);
  }

  const estimatedMrrAtRisk = atRiskClients.reduce(
    (sum, client) => sum + client.mrr,
    0
  );

  return {
    analytics: {
      healthDistribution,
      lastContactDistribution,
      averageLtv,
      averageLifespanMonths,
      monthlyChurnRate,
    },
    growth: {
      clientsWithoutRetainers: clientsWithoutRetainers.slice(0, 10), // Top 10
      averageProjectValueTrend: avgProjectValueTrend,
    },
    churn: {
      atRiskClients,
      expiringRetainers,
      estimatedMrrAtRisk,
    },
  };
}

