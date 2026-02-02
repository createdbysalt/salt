import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getSavedIntelligence } from "@/app/_features/intelligence/actions";
import { LibraryTab } from "../LibraryTab";
import { IntelligenceNavTabs } from "../../components/IntelligenceNavTabs";
import { PageHeader } from "@repo/patterns";

export const metadata = {
  title: "Intelligence Library | Salt",
  description: "Saved intelligence assets and reports",
};

/**
 * Strategy Mode - Intelligence → Library View
 *
 * Organized intelligence assets saved for reference.
 * Part of the Intelligence multi-view section.
 */
export default async function IntelligenceLibraryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch library data
  const savedResult = await getSavedIntelligence({ limit: 50 });
  const savedData = savedResult.ok
    ? savedResult.data
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

      {/* Library Content */}
      <LibraryTab initialData={savedData} />
    </div>
  );
}
