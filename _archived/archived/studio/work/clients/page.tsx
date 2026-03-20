import { ClientsPageClient } from "../../clients/ClientsPageClient";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { getClientsWithMetrics } from "@/app/_features/workspace/queries";
import { getUpcomingMeetings } from "@/app/_features/calendar/queries";
import { WorkTabs } from "../../components/WorkTabs";
import { PageHeader } from "@repo/patterns";

export const dynamic = "force-dynamic";

/**
 * Studio Mode - Work → Clients View
 *
 * All clients with CRM data and knowledge base access.
 * Part of the Work multi-view section.
 */
export default async function WorkClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    status?: string;
    tag?: string;
    company?: string;
  }>;
}) {
  const params = await searchParams;
  const { studio, supabase } = await getStudioContext();

  // Fetch clients with all metrics
  const clients = await getClientsWithMetrics({
    status: params.status as "active" | "inactive" | undefined,
    tagIds: params.tag ? [params.tag] : undefined,
  });

  // Fetch upcoming meetings for the widget (next 5)
  const upcomingMeetings = await getUpcomingMeetings(5);

  // Fetch all tags for filters
  const { data: tags } = await supabase
    .from("tags")
    .select("id, label, color")
    .eq("studio_id", studio.id)
    .eq("type", "client")
    .order("label");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work"
        description="Manage your projects, clients, and pipeline"
        noBorder
      />
      <WorkTabs />
      <ClientsPageClient
        clients={clients}
        upcomingMeetings={upcomingMeetings}
        tags={tags || []}
        companies={[]}
        initialView={params.view as "table" | "grid" | undefined}
      />
    </div>
  );
}
