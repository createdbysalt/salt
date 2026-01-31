import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getSeoOverview } from "@/app/_features/seo/actions";
import { ReportsTabs } from "./ReportsTabs";

export const metadata = {
  title: "Reports | Salt",
  description: "Strategic and performance reports",
};

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch SEO overview data for Performance tab
  const seoOverviewResult = await getSeoOverview();

  const seoOverviewData = seoOverviewResult.ok
    ? seoOverviewResult.data
    : {
        projects: [],
        summary: {
          totalTracked: 0,
          averagePerformance: null,
          averageSeo: null,
          projectsNeedingAttention: 0,
          projectsCritical: 0,
          totalAlerts: 0,
        },
      };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Strategic insights and performance analytics
        </p>
      </div>

      {/* Tabs */}
      <ReportsTabs seoOverviewData={seoOverviewData} />
    </div>
  );
}
