import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getIntelligenceQueue } from "@/app/_features/intelligence/actions";
import { QueueTab } from "../QueueTab";
import { IntelligenceNavTabs } from "../../components/IntelligenceNavTabs";
import { PageHeader } from "@repo/patterns";

export const metadata = {
  title: "Intelligence Queue | Salt",
  description: "Generation queue and pending intelligence jobs",
};

/**
 * Strategy Mode - Intelligence → Queue View
 *
 * Intelligence generation queue showing pending and running jobs.
 * Part of the Intelligence multi-view section.
 */
export default async function IntelligenceQueuePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch queue data
  const queueResult = await getIntelligenceQueue({ limit: 50 });
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

      {/* Intelligence Section Tabs */}
      <IntelligenceNavTabs />

      {/* Queue Content */}
      <QueueTab initialData={queueData} />
    </div>
  );
}
