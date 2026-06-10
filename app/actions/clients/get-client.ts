"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { calculateClientHealthScore } from "./calculate-health-score";

export interface ClientDetail {
  id: string;
  name: string;
  companyName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactName: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  lastContactAt: string | null;

  // Company (legacy relation)
  company: {
    id: string;
    name: string;
  } | null;

  // Metrics
  projectCount: number;
  mrr: number;
  ltv: number;
  healthScore: number;
  healthFactors: Array<{ factor: string; impact: number; reason: string }>;

  // Chart data
  activityData: Array<{ month: string; messages: number; meetings: number }>;
  revenueData: Array<{ month: string; revenue: number }>;

  // Tags
  tags: Array<{
    id: string;
    label: string;
    color: string;
  }>;

  // Lifecycle
  lifecycleStage: "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";
  stageEnteredAt: string | null;

  // Notes
  notes: string | null;

  // Soft delete / archive
  archivedAt: string | null;
  deletedAt: string | null;
}

export async function getClient(clientId: string): Promise<ClientDetail | null> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const supabase = await createClient();

  // Fetch the client
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("studio_id", workspace.id)
    .single();

  if (error || !client) {
    console.error("Error fetching client:", error);
    return null;
  }

  // Get project count
  const { count: projectCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client.id);

  // Get MRR from active retainers
  const { data: subscriptions } = await supabase
    .from("portal_client_subscriptions")
    .select("amount_cents")
    .eq("client_id", client.id)
    .in("status", ["active", "trialing"]);

  const mrr = subscriptions?.reduce((sum, sub) => sum + (sub.amount_cents || 0), 0) || 0;

  // Get LTV from paid invoices
  const { data: invoices } = await supabase
    .from("portal_invoices")
    .select("amount_cents")
    .eq("client_id", client.id)
    .eq("status", "paid");

  const ltv = invoices?.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) || 0;

  // Get tags
  const { data: tagAssignments } = await supabase
    .from("tag_assignments")
    .select(`
      tag:tags(id, label, color)
    `)
    .eq("entity_type", "client")
    .eq("entity_id", client.id);

  const tags =
    tagAssignments
      ?.map((ta: any) => ta.tag)
      .filter((t: any) => t) || [];

  // Calculate health score
  let healthScore = 75;
  let healthFactors: Array<{ factor: string; impact: number; reason: string }> = [];

  try {
    const healthResult = await calculateClientHealthScore(client.id);
    healthScore = healthResult.score;
    healthFactors = healthResult.factors;
  } catch (e) {
    console.log("Health score calculation skipped (tables may not exist yet)");
  }

  // Get activity data (messages + meetings) for last 6 months
  const activityData: Array<{ month: string; messages: number; meetings: number }> = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthLabel = monthStart.toLocaleDateString("en-US", { month: "short" });

    // Count messages for this client in this month
    let messageCount = 0;
    try {
      // First get conversations for this client
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", client.id);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map((c) => c.id);
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", conversationIds)
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());
        messageCount = count || 0;
      }
    } catch (e) {
      // Tables may not exist
    }

    // Count meetings for this client in this month
    let meetingCount = 0;
    try {
      const { count } = await supabase
        .from("client_meetings")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id)
        .gte("start_time", monthStart.toISOString())
        .lte("start_time", monthEnd.toISOString());
      meetingCount = count || 0;
    } catch (e) {
      // Table may not exist
    }

    activityData.push({ month: monthLabel, messages: messageCount, meetings: meetingCount });
  }

  // Get revenue data for last 6 months
  const revenueData: Array<{ month: string; revenue: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthLabel = monthStart.toLocaleDateString("en-US", { month: "short" });

    let monthRevenue = 0;
    try {
      const { data: monthInvoices } = await supabase
        .from("portal_invoices")
        .select("amount_cents")
        .eq("client_id", client.id)
        .eq("status", "paid")
        .gte("paid_at", monthStart.toISOString())
        .lte("paid_at", monthEnd.toISOString());

      monthRevenue = (monthInvoices || []).reduce(
        (sum, inv) => sum + (inv.amount_cents || 0),
        0
      ) / 100;
    } catch (e) {
      // Table may not exist
    }

    revenueData.push({ month: monthLabel, revenue: monthRevenue });
  }

  return {
    id: client.id,
    name: client.name,
    companyName: client.company_name || null,
    contactEmail: client.contact_email,
    contactPhone: client.contact_phone,
    contactName: client.contact_name || null,
    address: client.address || null,
    status: client.status || "active",
    createdAt: client.created_at,
    lastContactAt: client.last_contact_at || null,
    company: null, // Company relation not yet implemented
    projectCount: projectCount || 0,
    mrr: mrr / 100,
    ltv: ltv / 100,
    healthScore,
    healthFactors,
    activityData,
    revenueData,
    tags,
    lifecycleStage: client.lifecycle_stage || "lead",
    stageEnteredAt: client.stage_entered_at || null,
    notes: client.notes || null,
    archivedAt: client.archived_at || null,
    deletedAt: client.deleted_at || null,
  };
}
