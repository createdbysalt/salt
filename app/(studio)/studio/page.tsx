import { Suspense } from "react";
import { Skeleton } from "@repo/ui";
import { getStudioDashboardData } from "@/app/actions/insights/get-studio-dashboard";
import {
  StudioMetricCards,
  RevenueChart,
  DashboardAttentionSection,
} from "@/app/_features/studio/components";
import { StudioHomePageClient } from "./StudioHomePageClient";

// Loading skeleton for metric cards
function MetricCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for chart
function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-48 mb-6" />
      <Skeleton className="h-[250px] w-full" />
    </div>
  );
}

// Loading skeleton for attention section
function AttentionSectionSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard content component (server-side data fetching)
async function DashboardContent() {
  const dashboardData = await getStudioDashboardData();

  return (
    <>
      {/* Tier 1: The Pulse - 4 Metric Cards */}
      <StudioMetricCards metrics={dashboardData.metrics} />

      {/* Tier 2: Revenue Trend Chart */}
      <RevenueChart data={dashboardData.revenueChart} />

      {/* Tier 3: Action Items & Recent Wins */}
      <DashboardAttentionSection
        actionItems={dashboardData.actionItems}
        recentWins={dashboardData.recentWins}
      />
    </>
  );
}

interface StudioPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const { tab } = await searchParams;
  const activeTab = tab === "customize" ? "customize" : "overview";

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-2 md:gap-6 md:py-3">
          <StudioHomePageClient
            defaultTab={activeTab}
            overviewContent={
              <Suspense
                fallback={
                  <>
                    <MetricCardsSkeleton />
                    <ChartSkeleton />
                    <AttentionSectionSkeleton />
                  </>
                }
              >
                <DashboardContent />
              </Suspense>
            }
          />
        </div>
      </div>
    </div>
  );
}
