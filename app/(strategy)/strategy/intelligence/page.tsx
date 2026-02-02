import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getIntelligenceFeed } from "@/app/_features/intelligence/actions";
import { FeedTab } from "./FeedTab";
import { IntelligenceNavTabs } from "../components/IntelligenceNavTabs";
import { PageHeader } from "@repo/patterns";

export const metadata = {
  title: "Intelligence | Salt",
  description: "Intelligence feed, library, and generation queue",
};

/**
 * Strategy Mode - Intelligence → Feed View (default)
 *
 * Real-time intelligence stream.
 * Part of the Intelligence multi-view section.
 */
export default async function IntelligencePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch feed data
  const feedResult = await getIntelligenceFeed({ limit: 50 });
  const feedData = feedResult.ok
    ? feedResult.data
    : { events: [], total: 0, hasMore: false };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Intelligence"
        description="Strategic and technical intelligence across all projects"
        noBorder
      />

      {/* Intelligence Section Tabs */}
      <IntelligenceNavTabs />

      {/* Feed Content */}
      <FeedTab initialData={feedData} />
    </div>
  );
}
