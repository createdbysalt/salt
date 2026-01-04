import { getStudioContext } from "@/libs/user-dashboard";
import { getOverviewData } from "./actions/get-overview-data";
import { generateAIInsights } from "./actions/generate-ai-insights";
import { HeroMetrics } from "./components/HeroMetrics";
import { TodayWidget } from "./components/TodayWidget";
import { UpcomingMeetingsWidget } from "./components/UpcomingMeetingsWidget";
import { QuickStatsGrid } from "./components/QuickStatsGrid";
import { ProjectsTable } from "./components/ProjectsTable";
import { AIInsightsPanel } from "./components/AIInsightsPanel";
import { SetupFloatingBadge } from "@/src/features/onboarding/components/SetupFloatingBadge";
import { SetupCelebrationWrapper } from "@/src/features/onboarding/components/SetupCelebrationWrapper";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { studio, supabase, userId } = await getStudioContext();

  // Fetch all overview data
  const overviewData = await getOverviewData();

  // Get AI insights (deterministic + optional AI rewrite)
  const insights = await generateAIInsights(overviewData);

  // Get user for greeting
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .single();

  const metaFirstName = (user?.user_metadata?.first_name as string | undefined)?.trim();
  const metaFullName = (
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    ""
  ).trim();
  const displayName = (profile?.display_name || "").trim();
  const email = profile?.email || user?.email || "";
  const firstName =
    metaFirstName ||
    metaFullName.split(/\s+/)[0] ||
    displayName.split(/\s+/)[0] ||
    email.split("@")[0] ||
    "there";

  const viewer = { firstName };

  return (
    <div className="space-y-8">
      {/* Celebration Modal */}
      <SetupCelebrationWrapper />
      
      {/* Floating Setup Badge */}
      <SetupFloatingBadge />

      {/* Header */}
      <div className="flex items-center justify-between">
        <PageGreetingHeader page="overview" viewer={viewer} mode="greeting" />
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Hero Metrics */}
      <HeroMetrics
        mrr={overviewData.heroMetrics.mrr}
        pipeline={overviewData.heroMetrics.pipeline}
        thisMonth={overviewData.heroMetrics.thisMonth}
      />

      {/* Main Grid: Today + Meetings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TodayWidget
          urgent={overviewData.todayTasks.urgent}
          dueToday={overviewData.todayTasks.dueToday}
          dueThisWeek={overviewData.todayTasks.dueThisWeek}
          urgentCount={overviewData.todayTasks.urgentCount}
          dueTodayCount={overviewData.todayTasks.dueTodayCount}
          dueThisWeekCount={overviewData.todayTasks.dueThisWeekCount}
        />
        <UpcomingMeetingsWidget />
      </div>

      {/* Quick Stats */}
      <QuickStatsGrid
        activeCount={overviewData.projects.activeCount}
        retainerCount={overviewData.projects.retainerCount}
        oneTimeCount={overviewData.projects.oneTimeCount}
        healthAverage={overviewData.clients.healthAverage}
        atRiskCount={overviewData.clients.atRiskCount}
      />

      {/* Active Projects - Full Width */}
      <ProjectsTable projects={overviewData.projects.recentProjects} />

      {/* AI Insights - Full Width */}
      <AIInsightsPanel insights={insights} />
    </div>
  );
}
