import { Suspense } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { redirect } from "next/navigation";
import { getStudioContext, getStudioDetails } from "@/app/_lib/utils/user-dashboard";
import { StudioHomePageClient } from "./StudioHomePageClient";
import { Skeleton } from "@repo/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Studio | Salt Core",
  description: "Your studio dashboard - metrics, wins, and configuration",
};

// ============================================================================
// DATA FETCHING
// ============================================================================

interface PulseMetrics {
  revenueThisMonth: number;
  revenueTrend: number;
  activeClients: number;
  clientsTrend: number;
  projectsInFlight: number;
  projectsTrend: number;
  pipelineValue: number;
  pipelineTrend: number;
}

interface RecentWin {
  id: string;
  type: "invoice_paid" | "project_completed" | "client_signed" | "proposal_accepted";
  title: string;
  subtitle?: string;
  amount?: number;
  timestamp: Date;
}

interface AttentionItem {
  id: string;
  type: "overdue" | "pending" | "due_soon";
  title: string;
  subtitle?: string;
  href: string;
  daysOverdue?: number;
}

async function getStudioPulse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string
): Promise<PulseMetrics> {
  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Revenue this month
  let revenueThisMonth = 0;
  let revenueLastMonth = 0;

  try {
    const { data: invoicesThisMonth } = await supabase
      .from("bridge_invoices")
      .select("amount_cents")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .gte("paid_at", firstDayThisMonth.toISOString());

    revenueThisMonth =
      (invoicesThisMonth || []).reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;

    const { data: invoicesLastMonth } = await supabase
      .from("bridge_invoices")
      .select("amount_cents")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .gte("paid_at", firstDayLastMonth.toISOString())
      .lte("paid_at", lastDayLastMonth.toISOString());

    revenueLastMonth =
      (invoicesLastMonth || []).reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;
  } catch (e) {
    // Table might not exist
  }

  const revenueTrend =
    revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : 0;

  // Active clients
  const { count: activeClients } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("studio_id", studioId)
    .eq("status", "active");

  // Projects in flight
  const { count: projectsInFlight } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("studio_id", studioId)
    .in("status", ["active", "in_progress", "signed"]);

  // Pipeline value (from pending proposals)
  let pipelineValue = 0;
  try {
    const { data: proposals } = await supabase
      .from("proposals")
      .select("total_price")
      .eq("studio_id", studioId)
      .in("status", ["draft", "sent", "viewed"]);

    pipelineValue = (proposals || []).reduce((sum, p) => sum + (p.total_price || 0), 0);
  } catch (e) {
    // Table might not exist
  }

  return {
    revenueThisMonth,
    revenueTrend,
    activeClients: activeClients || 0,
    clientsTrend: 0, // Would need historical data
    projectsInFlight: projectsInFlight || 0,
    projectsTrend: 0, // Would need historical data
    pipelineValue,
    pipelineTrend: 0, // Would need historical data
  };
}

async function getRecentWins(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string
): Promise<RecentWin[]> {
  const wins: RecentWin[] = [];
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Paid invoices
  try {
    const { data: paidInvoices } = await supabase
      .from("bridge_invoices")
      .select("id, amount_cents, paid_at, clients(name)")
      .eq("studio_id", studioId)
      .eq("status", "paid")
      .gte("paid_at", fourteenDaysAgo.toISOString())
      .order("paid_at", { ascending: false })
      .limit(5);

    for (const invoice of paidInvoices || []) {
      wins.push({
        id: `invoice-${invoice.id}`,
        type: "invoice_paid",
        title: "Invoice paid",
        subtitle: (invoice.clients as any)?.name,
        amount: invoice.amount_cents / 100,
        timestamp: new Date(invoice.paid_at),
      });
    }
  } catch (e) {
    // Table might not exist
  }

  // Completed projects
  try {
    const { data: completedProjects } = await supabase
      .from("projects")
      .select("id, name, updated_at, clients(name)")
      .eq("studio_id", studioId)
      .eq("status", "completed")
      .gte("updated_at", fourteenDaysAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(5);

    for (const project of completedProjects || []) {
      wins.push({
        id: `project-${project.id}`,
        type: "project_completed",
        title: `Project completed: ${project.name}`,
        subtitle: (project.clients as any)?.name,
        timestamp: new Date(project.updated_at),
      });
    }
  } catch (e) {
    // Handle error
  }

  // New clients
  try {
    const { data: newClients } = await supabase
      .from("clients")
      .select("id, name, created_at")
      .eq("studio_id", studioId)
      .gte("created_at", fourteenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    for (const client of newClients || []) {
      wins.push({
        id: `client-${client.id}`,
        type: "client_signed",
        title: `New client: ${client.name}`,
        timestamp: new Date(client.created_at),
      });
    }
  } catch (e) {
    // Handle error
  }

  // Accepted proposals
  try {
    const { data: acceptedProposals } = await supabase
      .from("proposals")
      .select("id, title, total_price, updated_at, clients(name)")
      .eq("studio_id", studioId)
      .eq("status", "accepted")
      .gte("updated_at", fourteenDaysAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(5);

    for (const proposal of acceptedProposals || []) {
      wins.push({
        id: `proposal-${proposal.id}`,
        type: "proposal_accepted",
        title: `Proposal accepted: ${proposal.title}`,
        subtitle: (proposal.clients as any)?.name,
        amount: proposal.total_price,
        timestamp: new Date(proposal.updated_at),
      });
    }
  } catch (e) {
    // Table might not exist
  }

  // Sort by timestamp (most recent first)
  wins.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return wins.slice(0, 10);
}

async function getAttentionItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studioId: string
): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  // Overdue invoices
  try {
    const { data: overdueInvoices } = await supabase
      .from("bridge_invoices")
      .select("id, due_date, clients(name)")
      .eq("studio_id", studioId)
      .in("status", ["sent", "open"])
      .lt("due_date", now.toISOString())
      .order("due_date", { ascending: true })
      .limit(3);

    for (const invoice of overdueInvoices || []) {
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      items.push({
        id: `invoice-${invoice.id}`,
        type: "overdue",
        title: "Overdue invoice",
        subtitle: (invoice.clients as any)?.name,
        href: `/studio/billing`,
        daysOverdue,
      });
    }
  } catch (e) {
    // Table might not exist
  }

  // Pending proposals (sent but not viewed for 3+ days)
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(now.getDate() - 3);

    const { data: staleProposals } = await supabase
      .from("proposals")
      .select("id, title, clients(name)")
      .eq("studio_id", studioId)
      .eq("status", "sent")
      .lt("sent_at", threeDaysAgo.toISOString())
      .limit(3);

    for (const proposal of staleProposals || []) {
      items.push({
        id: `proposal-${proposal.id}`,
        type: "pending",
        title: `Follow up: ${proposal.title}`,
        subtitle: (proposal.clients as any)?.name,
        href: `/strategy/proposals/${proposal.id}`,
      });
    }
  } catch (e) {
    // Table might not exist
  }

  // Upcoming milestones
  try {
    const { data: upcomingMilestones } = await supabase
      .from("project_milestones")
      .select("id, title, due_date, projects(name)")
      .eq("studio_id", studioId)
      .in("status", ["pending", "in_progress"])
      .gte("due_date", now.toISOString())
      .lte("due_date", sevenDaysFromNow.toISOString())
      .order("due_date", { ascending: true })
      .limit(3);

    for (const milestone of upcomingMilestones || []) {
      items.push({
        id: `milestone-${milestone.id}`,
        type: "due_soon",
        title: milestone.title,
        subtitle: (milestone.projects as any)?.name,
        href: `/studio/projects`,
      });
    }
  } catch (e) {
    // Table might not exist
  }

  return items.slice(0, 5);
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

function StudioHomeSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <Skeleton className="h-10 w-48" />

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-80" />

      {/* Metrics skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>

      {/* Two columns skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

async function StudioHomeContent() {
  const { studio: studioMembership, supabase } = await getStudioContext();

  // Get full studio details
  const studio = await getStudioDetails(studioMembership.id);

  // Fetch studio brand config
  const { data: brandConfig } = await supabase
    .from("studio_brand_config")
    .select("*")
    .eq("studio_id", studio.id)
    .single();

  // Fetch counts for setup progress
  const { count: servicesCount } = await supabase
    .from("studio_services")
    .select("*", { count: "exact", head: true })
    .eq("studio_id", studio.id);

  const { count: portfolioCount } = await supabase
    .from("studio_portfolio")
    .select("*", { count: "exact", head: true })
    .eq("studio_id", studio.id);

  // Calculate setup progress
  const setupChecks = {
    hasLogo: !!studio.logo_url || !!brandConfig?.logo_light_url,
    hasDescription: !!studio.description,
    hasBrandVoice: (brandConfig?.voice_tone?.length ?? 0) > 0,
    hasColors: !!brandConfig?.color_primary,
    hasServices: (servicesCount ?? 0) > 0,
    hasPortfolio: (portfolioCount ?? 0) > 0,
  };

  const completedSteps = Object.values(setupChecks).filter(Boolean).length;
  const totalSteps = Object.keys(setupChecks).length;
  const setupProgress = Math.round((completedSteps / totalSteps) * 100);

  // Fetch dashboard data
  const [pulseMetrics, recentWins, attentionItems] = await Promise.all([
    getStudioPulse(supabase, studio.id),
    getRecentWins(supabase, studio.id),
    getAttentionItems(supabase, studio.id),
  ]);

  return (
    <StudioHomePageClient
      studio={studio}
      brandConfig={brandConfig}
      setupProgress={setupProgress}
      setupChecks={setupChecks}
      pulseMetrics={pulseMetrics}
      recentWins={recentWins}
      attentionItems={attentionItems}
    />
  );
}

export default async function StudioHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<StudioHomeSkeleton />}>
        <StudioHomeContent />
      </Suspense>
    </div>
  );
}
