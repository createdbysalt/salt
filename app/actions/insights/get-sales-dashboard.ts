"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type {
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

export interface PipelineStage {
  name: string;
  count: number;
  value: number;
}

export interface SalesDashboardData {
  metrics: {
    pipelineValue: MetricCard;
    leadsThisMonth: MetricCard;
    conversionRate: MetricCard;
    avgDealSize: MetricCard;
  };
  pipelineStages: PipelineStage[];
  actionItems: ActionItem[];
  recentWins: RecentWin[];
  generatedAt: string;
}

export async function getSalesDashboardData(): Promise<SalesDashboardData> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  // Fetch all data in parallel
  const [leadsResult, proposalsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, lifecycle_stage, stage_entered_at, created_at, updated_at")
      .eq("studio_id", studio.id)
      .in("lifecycle_stage", ["lead", "discovery", "pitch", "active", "complete", "on_hold", "lost"]),
    supabase
      .from("proposals")
      .select("id, title, total_amount, status, sent_at, updated_at, clients(id, name)")
      .eq("studio_id", studio.id),
  ]);

  const leads = leadsResult.data || [];
  const proposals = proposalsResult.data || [];

  // Calculate pipeline stages - full lifecycle
  const stageOrder = ["lead", "discovery", "pitch", "active", "complete", "on_hold", "lost"];
  const stageCounts = new Map<string, { count: number; value: number }>();

  for (const stage of stageOrder) {
    stageCounts.set(stage, { count: 0, value: 0 });
  }

  for (const lead of leads) {
    const stage = lead.lifecycle_stage;
    if (stageCounts.has(stage)) {
      const current = stageCounts.get(stage)!;
      current.count++;
    }
  }

  // Add proposal values to pitch stage
  const sentProposals = proposals.filter((p) => p.status === "sent");
  for (const proposal of sentProposals) {
    const pitchStage = stageCounts.get("pitch")!;
    pitchStage.value += Number(proposal.total_amount) || 0;
  }

  const pipelineStages: PipelineStage[] = [
    { name: "Inquiry", ...stageCounts.get("lead")! },
    { name: "Discovery", ...stageCounts.get("discovery")! },
    { name: "Pitch", ...stageCounts.get("pitch")! },
    { name: "Active", ...stageCounts.get("active")! },
    { name: "Complete", ...stageCounts.get("complete")! },
    { name: "On Hold", ...stageCounts.get("on_hold")! },
    { name: "Lost", ...stageCounts.get("lost")! },
  ];

  // Calculate metrics
  const totalPipelineValue = sentProposals.reduce(
    (sum, p) => sum + (Number(p.total_amount) || 0),
    0
  );

  // Pipeline stages (not yet converted)
  const pipelineStageNames = ["lead", "discovery", "pitch"];
  // Converted stages (active clients)
  const convertedStageNames = ["active", "complete"];

  const leadsThisMonth = leads.filter((l) => {
    const created = new Date(l.created_at);
    return created >= startOfMonth && pipelineStageNames.includes(l.lifecycle_stage);
  }).length;

  const totalLeads = leads.filter((l) => pipelineStageNames.includes(l.lifecycle_stage)).length;
  const totalClients = leads.filter((l) => convertedStageNames.includes(l.lifecycle_stage)).length;
  const conversionRate = totalLeads + totalClients > 0
    ? (totalClients / (totalLeads + totalClients)) * 100
    : 0;

  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const avgDealSize = acceptedProposals.length > 0
    ? acceptedProposals.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0) / acceptedProposals.length
    : 0;

  // Build metric cards
  const pipelineValueCard: MetricCard = {
    title: "Pipeline Value",
    value: formatCurrency(totalPipelineValue),
    rawValue: totalPipelineValue,
    badge: {
      value: sentProposals.length > 0 ? `${sentProposals.length} proposals` : "No proposals",
      trend: sentProposals.length > 0 ? "up" : "neutral",
    },
    context: {
      line1: sentProposals.length > 0 ? "In active proposals" : "Send proposals to build pipeline",
      line2: totalLeads > 0 ? `${totalLeads} leads in pipeline` : "",
    },
  };

  const leadsThisMonthCard: MetricCard = {
    title: "Leads This Month",
    value: leadsThisMonth.toString(),
    rawValue: leadsThisMonth,
    badge: {
      value: leadsThisMonth > 0 ? "New leads" : "None yet",
      trend: leadsThisMonth > 0 ? "up" : "neutral",
    },
    context: {
      line1: `${totalLeads} total in pipeline`,
      line2: leadsThisMonth > 0 ? "Keep the momentum" : "Time to prospect",
    },
  };

  const conversionRateCard: MetricCard = {
    title: "Conversion Rate",
    value: `${conversionRate.toFixed(0)}%`,
    rawValue: conversionRate,
    badge: {
      value: totalClients > 0 ? `${totalClients} converted` : "No conversions",
      trend: conversionRate > 0 ? "up" : "neutral",
    },
    context: {
      line1: "Leads to clients",
      line2: totalClients > 0 ? `${totalClients} client${totalClients === 1 ? "" : "s"} won` : "",
    },
  };

  const avgDealSizeCard: MetricCard = {
    title: "Avg Deal Size",
    value: formatCurrency(avgDealSize),
    rawValue: avgDealSize,
    badge: {
      value: acceptedProposals.length > 0 ? `${acceptedProposals.length} deals` : "No deals yet",
      trend: avgDealSize > 0 ? "up" : "neutral",
    },
    context: {
      line1: acceptedProposals.length > 0 ? "From accepted proposals" : "Close deals to track",
      line2: "",
    },
  };

  // Build action items (sales-focused)
  const actionItems: ActionItem[] = [];

  // Stale leads (only check pipeline stages, not converted clients)
  for (const lead of leads) {
    if (!pipelineStageNames.includes(lead.lifecycle_stage)) continue;

    const lastActivity = new Date(lead.updated_at);
    const daysStale = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysStale >= 7) {
      actionItems.push({
        id: `lead-${lead.id}`,
        type: "lead",
        title: lead.name,
        subtitle: `${lead.lifecycle_stage} · ${daysStale} days stale`,
        status: "stale",
        daysInStage: daysStale,
        href: `/clients/${lead.id}`,
      });
    }
  }

  // Proposals awaiting response
  for (const proposal of sentProposals) {
    const client = proposal.clients as unknown as { id: string; name: string } | null;
    const sentDate = proposal.sent_at ? new Date(proposal.sent_at) : null;
    const daysSinceSent = sentDate
      ? Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysSinceSent >= 7) {
      actionItems.push({
        id: `proposal-${proposal.id}`,
        type: "proposal",
        title: proposal.title || formatCurrency(Number(proposal.total_amount) || 0),
        subtitle: client?.name || "Client",
        status: "stale",
        amount: Number(proposal.total_amount) || 0,
        daysInStage: daysSinceSent,
        href: `/sales/proposals/${proposal.id}`,
      });
    }
  }

  // Sort by days stale
  actionItems.sort((a, b) => (b.daysInStage || 0) - (a.daysInStage || 0));

  // Build recent wins
  const recentWins: RecentWin[] = [];

  // Accepted proposals
  const recentAccepted = proposals
    .filter((p) => p.status === "accepted" && new Date(p.updated_at) >= fourteenDaysAgo)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  for (const proposal of recentAccepted) {
    const client = proposal.clients as unknown as { id: string; name: string } | null;
    recentWins.push({
      id: `proposal-${proposal.id}`,
      type: "proposal_accepted",
      title: `Proposal accepted`,
      subtitle: client?.name || proposal.title || "Client",
      amount: Number(proposal.total_amount) || 0,
      timestamp: new Date(proposal.updated_at),
      href: `/clients/${client?.id}`,
    });
  }

  // New leads
  const recentLeads = leads
    .filter((l) => pipelineStageNames.includes(l.lifecycle_stage) && new Date(l.created_at) >= fourteenDaysAgo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  for (const lead of recentLeads) {
    recentWins.push({
      id: `lead-${lead.id}`,
      type: "new_client",
      title: "New lead",
      subtitle: lead.name,
      timestamp: new Date(lead.created_at),
      href: `/clients/${lead.id}`,
    });
  }

  recentWins.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    metrics: {
      pipelineValue: pipelineValueCard,
      leadsThisMonth: leadsThisMonthCard,
      conversionRate: conversionRateCard,
      avgDealSize: avgDealSizeCard,
    },
    pipelineStages,
    actionItems: actionItems.slice(0, 10),
    recentWins: recentWins.slice(0, 5),
    generatedAt: now.toISOString(),
  };
}
