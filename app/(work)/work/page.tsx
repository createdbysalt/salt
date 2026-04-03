import { Suspense } from "react";
import { Skeleton } from "@repo/ui";
import { getWorkDashboardData } from "@/app/actions/insights/get-work-dashboard";
import { WorkMetricCards, ProjectStatusChart, MilestoneStatusChart } from "@/app/_features/work/components";
import { DashboardAttentionSection } from "@/app/_features/studio/components";

// Loading skeletons
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

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-4 w-24 mb-6" />
        <Skeleton className="aspect-square max-h-[250px] w-full mx-auto rounded-full" />
      </div>
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-4 w-24 mb-6" />
        <div className="space-y-3 h-[200px]">
          <Skeleton className="h-8 w-full rounded" />
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-8 w-1/2 rounded" />
          <Skeleton className="h-8 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}

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

async function WorkOverviewContent() {
  const dashboardData = await getWorkDashboardData();

  return (
    <>
      {/* Metric Cards - Operational metrics, no money data */}
      <WorkMetricCards metrics={dashboardData.metrics} />

      {/* Charts - Project Status (Pie) + Milestone Status (Bar) */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <ProjectStatusChart data={dashboardData.projectStatus} />
        <MilestoneStatusChart data={dashboardData.milestoneStatus} />
      </div>

      {/* Action Items & Recent Wins */}
      <DashboardAttentionSection
        actionItems={dashboardData.actionItems}
        recentWins={dashboardData.recentWins}
      />
    </>
  );
}

export default async function WorkOverviewPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-2 md:gap-6 md:py-3 px-4 lg:px-6">
          <Suspense
            fallback={
              <>
                <MetricCardsSkeleton />
                <ChartsSkeleton />
                <AttentionSectionSkeleton />
              </>
            }
          >
            <WorkOverviewContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
