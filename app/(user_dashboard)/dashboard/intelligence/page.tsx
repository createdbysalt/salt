import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import {
  getIntelligenceFeed,
  getSavedIntelligence,
  getIntelligenceQueue,
} from "@/app/_features/intelligence/actions";
import { IntelligenceTabs } from "./IntelligenceTabs";
import { PageHeader } from "@repo/patterns";

export const metadata = {
  title: "Intelligence | Salt",
  description: "Intelligence feed, library, and generation queue",
};

export default async function IntelligencePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch initial data for all tabs in parallel
  const [feedResult, savedResult, queueResult] = await Promise.all([
    getIntelligenceFeed({ limit: 50 }),
    getSavedIntelligence({ limit: 50 }),
    getIntelligenceQueue({ limit: 50 }),
  ]);

  // Extract data with fallbacks for errors
  const feedData = feedResult.ok
    ? feedResult.data
    : { events: [], total: 0, hasMore: false };

  const savedData = savedResult.ok
    ? savedResult.data
    : { events: [], total: 0, hasMore: false };

  const queueData = queueResult.ok
    ? queueResult.data
    : { jobs: [], pendingCount: 0, runningCount: 0 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Intelligence"
        description="Strategic and technical intelligence across all projects"
        noBorder
      />

      {/* Tabs */}
      <IntelligenceTabs
        initialFeed={feedData}
        initialSaved={savedData}
        initialQueue={queueData}
      />
    </div>
  );
}
