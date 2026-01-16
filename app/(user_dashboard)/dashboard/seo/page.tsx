import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getSeoOverview } from "@/app/_features/seo/actions";
import { SeoOverviewDashboard } from "./SeoOverviewDashboard";

export default async function SeoOverviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch SEO overview data
  const overviewResult = await getSeoOverview();

  if (!overviewResult.ok) {
    // Handle error - show empty state
    return (
      <SeoOverviewDashboard
        projects={[]}
        summary={{
          totalTracked: 0,
          averagePerformance: null,
          averageSeo: null,
          projectsNeedingAttention: 0,
          projectsCritical: 0,
          totalAlerts: 0,
        }}
      />
    );
  }

  return (
    <SeoOverviewDashboard
      projects={overviewResult.data.projects}
      summary={overviewResult.data.summary}
    />
  );
}
