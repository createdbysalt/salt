"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import type {
  BriefingData,
  BriefingItemData,
  WinItemData,
} from "@/app/_features/hq/components/briefing";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get today's briefing data for the HQ page
 */
export async function getTodayBriefing(): Promise<BriefingData> {
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);
  const supabase = await createClient();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch data in parallel
  const [
    milestonesResult,
    unreadResult,
    overdueInvoicesResult,
    staleLeadsResult,
    recentWinsResult,
  ] = await Promise.all([
    // Milestones due today/tomorrow
    getMilestonesDue(supabase, studio.id, today, tomorrow),
    // Unread messages count
    getUnreadCount(supabase, studio.id),
    // Overdue invoices
    getOverdueInvoices(supabase, studio.id, now),
    // Stale leads
    getStaleLeads(supabase, studio.id, now),
    // Recent wins (last 7 days)
    getRecentWins(supabase, studio.id, sevenDaysAgo),
  ]);

  // Build up next items (priorities)
  const upNext: BriefingItemData[] = [];

  // Add milestones
  for (const milestone of milestonesResult) {
    upNext.push({
      id: `milestone-${milestone.id}`,
      type: "milestone",
      title: milestone.title,
      subtitle: milestone.projectName,
      time: milestone.isToday ? "due today" : "due tomorrow",
      actions: [
        {
          label: "View",
          href: `/work/projects/${milestone.projectId}`,
          variant: "outline",
        },
      ],
    });
  }

  // Add unread messages indicator
  if (unreadResult.count > 0) {
    upNext.push({
      id: "unread-messages",
      type: "message",
      title: `${unreadResult.count} message${unreadResult.count === 1 ? "" : "s"} waiting`,
      subtitle: "Unread in inbox",
      actions: [
        {
          label: "Open inbox",
          href: "/hq/inbox",
          variant: "default",
        },
      ],
    });
  }

  // Build needs attention items (warnings)
  const needsAttention: BriefingItemData[] = [];

  // Add overdue invoices
  for (const invoice of overdueInvoicesResult) {
    needsAttention.push({
      id: `invoice-${invoice.id}`,
      type: "invoice",
      title: `${invoice.clientName} invoice`,
      subtitle: `${invoice.daysOverdue}d overdue`,
      amount: invoice.amount,
      daysOverdue: invoice.daysOverdue,
      actions: [
        {
          label: "Send reminder",
          variant: "outline",
        },
        {
          label: "Mark paid",
          variant: "ghost",
        },
      ],
    });
  }

  // Add stale leads
  for (const lead of staleLeadsResult) {
    needsAttention.push({
      id: `lead-${lead.id}`,
      type: "lead",
      title: lead.name,
      subtitle: `${lead.daysInStage}d without activity`,
      actions: [
        {
          label: "Check in",
          href: `/clients/${lead.id}`,
          variant: "outline",
        },
      ],
    });
  }

  // Build wins
  const wins: WinItemData[] = [];
  let winsTotalValue = 0;

  for (const win of recentWinsResult) {
    if (win.type === "payment") {
      wins.push({
        id: win.id,
        type: "payment",
        label: "received",
        value: win.amount,
      });
      winsTotalValue += win.amount || 0;
    } else if (win.type === "deal") {
      wins.push({
        id: win.id,
        type: "deal",
        label: "accepted",
        value: win.amount,
      });
      winsTotalValue += win.amount || 0;
    } else if (win.type === "project") {
      wins.push({
        id: win.id,
        type: "project",
        label: "completed",
      });
    } else if (win.type === "client") {
      wins.push({
        id: win.id,
        type: "client",
        label: "new client",
      });
    }
  }

  // Build glance data
  const glance = {
    meetings: 0, // TODO: Integrate with calendar
    unread: unreadResult.count,
    warnings: needsAttention.length,
    wins: wins.length,
  };

  return {
    glance,
    upNext,
    needsAttention,
    wins,
    winsTotalValue,
  };
}

// Helper functions

interface MilestoneData {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  isToday: boolean;
}

async function getMilestonesDue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string,
  today: Date,
  tomorrow: Date
): Promise<MilestoneData[]> {
  try {
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const { data } = await supabase
      .from("project_milestones")
      .select("id, title, due_date, projects(id, name, studio_id)")
      .gte("due_date", today.toISOString())
      .lt("due_date", dayAfterTomorrow.toISOString())
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true })
      .limit(5);

    if (!data) return [];

    return data
      .filter((m) => {
        const project = m.projects as unknown as { studio_id: string } | null;
        return project?.studio_id === studioId;
      })
      .map((m) => {
        const project = m.projects as unknown as { id: string; name: string };
        const dueDate = new Date(m.due_date);
        const isToday = dueDate < tomorrow;

        return {
          id: m.id,
          title: m.title,
          projectId: project.id,
          projectName: project.name,
          isToday,
        };
      });
  } catch {
    return [];
  }
}

async function getUnreadCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string
): Promise<{ count: number }> {
  try {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", studioId)
      .eq("is_read", false)
      .eq("sender_type", "client");

    return { count: count || 0 };
  } catch {
    return { count: 0 };
  }
}

interface OverdueInvoice {
  id: string;
  clientName: string;
  amount: number;
  daysOverdue: number;
}

async function getOverdueInvoices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string,
  now: Date
): Promise<OverdueInvoice[]> {
  try {
    const { data } = await supabase
      .from("bridge_invoices")
      .select("id, amount_cents, due_date, clients(name)")
      .eq("studio_id", studioId)
      .in("status", ["sent", "overdue"])
      .lt("due_date", now.toISOString())
      .order("due_date", { ascending: true })
      .limit(3);

    if (!data) return [];

    return data.map((inv) => {
      const client = inv.clients as unknown as { name: string } | null;
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: inv.id,
        clientName: client?.name || "Client",
        amount: (inv.amount_cents || 0) / 100,
        daysOverdue,
      };
    });
  } catch {
    return [];
  }
}

interface StaleLead {
  id: string;
  name: string;
  daysInStage: number;
}

async function getStaleLeads(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string,
  now: Date
): Promise<StaleLead[]> {
  try {
    const { data } = await supabase
      .from("clients")
      .select("id, name, updated_at")
      .eq("studio_id", studioId)
      .in("lifecycle_stage", ["lead", "discovery", "pitch"])
      .order("updated_at", { ascending: true })
      .limit(5);

    if (!data) return [];

    // Filter to only stale (7+ days inactive)
    return data
      .map((lead) => {
        const lastActivity = new Date(lead.updated_at);
        const daysInStage = Math.floor(
          (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: lead.id,
          name: lead.name,
          daysInStage,
        };
      })
      .filter((lead) => lead.daysInStage >= 7)
      .slice(0, 3);
  } catch {
    return [];
  }
}

interface WinData {
  id: string;
  type: "payment" | "deal" | "project" | "client";
  amount?: number;
}

async function getRecentWins(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string,
  since: Date
): Promise<WinData[]> {
  const wins: WinData[] = [];

  // Parallel fetch all win types
  const [payments, proposals, projects, clients] = await Promise.all([
    // Paid invoices
    (async () => {
      try {
        const { data } = await supabase
          .from("bridge_invoices")
          .select("id, amount_cents")
          .eq("studio_id", studioId)
          .eq("status", "paid")
          .gte("paid_at", since.toISOString())
          .limit(5);
        return data || [];
      } catch {
        return [];
      }
    })(),

    // Accepted proposals
    (async () => {
      try {
        const { data } = await supabase
          .from("proposals")
          .select("id, total_amount")
          .eq("studio_id", studioId)
          .eq("status", "accepted")
          .gte("updated_at", since.toISOString())
          .limit(5);
        return data || [];
      } catch {
        return [];
      }
    })(),

    // Completed projects
    (async () => {
      try {
        const { data } = await supabase
          .from("projects")
          .select("id")
          .eq("studio_id", studioId)
          .eq("status", "completed")
          .gte("updated_at", since.toISOString())
          .limit(5);
        return data || [];
      } catch {
        return [];
      }
    })(),

    // New clients
    (async () => {
      try {
        const { data } = await supabase
          .from("clients")
          .select("id")
          .eq("studio_id", studioId)
          .gte("created_at", since.toISOString())
          .limit(5);
        return data || [];
      } catch {
        return [];
      }
    })(),
  ]);

  // Aggregate payments into one win
  if (payments.length > 0) {
    const totalPayments = payments.reduce(
      (sum, p) => sum + (p.amount_cents || 0) / 100,
      0
    );
    wins.push({
      id: "payments",
      type: "payment",
      amount: totalPayments,
    });
  }

  // Aggregate proposals into one win
  if (proposals.length > 0) {
    const totalDeals = proposals.reduce(
      (sum, p) => sum + (Number(p.total_amount) || 0),
      0
    );
    wins.push({
      id: "deals",
      type: "deal",
      amount: totalDeals,
    });
  }

  // Add projects completed
  if (projects.length > 0) {
    wins.push({
      id: "projects",
      type: "project",
    });
  }

  // Add new clients
  if (clients.length > 0) {
    wins.push({
      id: "clients",
      type: "client",
    });
  }

  return wins;
}
