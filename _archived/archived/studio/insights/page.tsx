import { Suspense } from "react";
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { getInsightsDashboard, getAIInsights } from "@/app/_features/insights/queries";
import { InsightsDashboardClient } from "./InsightsDashboardClient";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Skeleton } from "@/app/_components/ui/skeleton";

export default async function InsightsPage() {
  // Fetch dashboard data and AI insights in parallel
  const [dashboardData, aiInsightsData] = await Promise.all([
    getInsightsDashboard(),
    getAIInsights(),
  ]);

  return (
    <div className="space-y-6">
      <PageGreetingHeader page="insights" />
      
      <Suspense fallback={<InsightsLoadingSkeleton />}>
        <InsightsDashboardClient
          data={dashboardData}
          aiInsights={aiInsightsData.insights}
          aiGeneratedAt={aiInsightsData.generatedAt}
          aiIsCached={aiInsightsData.isCached}
        />
      </Suspense>
    </div>
  );
}

function InsightsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
