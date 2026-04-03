import { Suspense } from "react";
import { Skeleton } from "@repo/ui";
import { getBillingDashboardData } from "@/app/actions/insights/get-billing-dashboard";
import {
  MetricCardsGrid,
  RevenueChart,
  DashboardAttentionSection,
} from "@/app/_features/studio/components";

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

function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-48 mb-6" />
      <Skeleton className="h-[250px] w-full" />
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

async function BillingOverviewContent() {
  const dashboardData = await getBillingDashboardData();

  const metrics = [
    dashboardData.metrics.mrr,
    dashboardData.metrics.outstanding,
    dashboardData.metrics.collectedMtd,
    dashboardData.metrics.overdueAmount,
  ];

  return (
    <>
      {/* Metric Cards */}
      <MetricCardsGrid metrics={metrics} />

      {/* Revenue Chart */}
      <RevenueChart data={dashboardData.revenueChart} />

      {/* Action Items & Recent Wins */}
      <DashboardAttentionSection
        actionItems={dashboardData.actionItems}
        recentWins={dashboardData.recentWins}
      />
    </>
  );
}

export default async function BillingOverviewPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-2 md:gap-6 md:py-3 px-4 lg:px-6">
          <Suspense
            fallback={
              <>
                <MetricCardsSkeleton />
                <ChartSkeleton />
                <AttentionSectionSkeleton />
              </>
            }
          >
            <BillingOverviewContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
