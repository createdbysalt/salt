import { Suspense } from "react";
import { Skeleton } from "@repo/ui";
import { getHqInsightsData } from "@/app/_features/hq/actions/get-hq-insights";
import {
  BusinessHealthScore,
  InsightsMetricCards,
  RevenueTrendChart,
  ClientHealthChart,
  DeliveryChart,
  PipelineChart,
} from "@/app/_features/hq/components";

// ============================================================================
// LOADING SKELETONS
// ============================================================================

function HealthScoreSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-48 mb-6" />
      <div className="flex justify-center">
        <Skeleton className="h-[200px] w-[200px] rounded-full" />
      </div>
    </div>
  );
}

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
        <Skeleton className="h-[200px] w-full" />
      </div>
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-4 w-24 mb-6" />
        <Skeleton className="h-[200px] w-full rounded-full mx-auto aspect-square max-w-[200px]" />
      </div>
    </div>
  );
}

// ============================================================================
// CONTENT COMPONENT
// ============================================================================

async function InsightsContent() {
  const data = await getHqInsightsData();

  return (
    <>
      {/* Row 1: Metric Cards */}
      <InsightsMetricCards metrics={data.metrics} />

      {/* Row 2: Business Health Score + Revenue Trend + Client Health */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
        <BusinessHealthScore data={data.healthScore} />
        <RevenueTrendChart data={data.revenueTrend} />
        <ClientHealthChart data={data.clientHealth} />
      </div>

      {/* Row 3: Delivery Performance + Pipeline */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <DeliveryChart data={data.deliveryPerformance} />
        <PipelineChart data={data.pipelineStages} />
      </div>
    </>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function InsightsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-2 md:gap-6 md:py-3 px-4 lg:px-6">
          <Suspense
            fallback={
              <div className="flex flex-col gap-4">
                <MetricCardsSkeleton />
                <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
                  <HealthScoreSkeleton />
                  <div className="rounded-xl border bg-card p-6">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-6" />
                    <Skeleton className="h-[200px] w-full" />
                  </div>
                  <div className="rounded-xl border bg-card p-6">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-6" />
                    <Skeleton className="h-[200px] w-full" />
                  </div>
                </div>
                <ChartsSkeleton />
              </div>
            }
          >
            <InsightsContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
