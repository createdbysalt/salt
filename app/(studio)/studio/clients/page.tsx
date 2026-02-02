import { ClientsPageClient } from "./ClientsPageClient";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { getClientsWithMetrics } from "@/app/_features/workspace/queries";
import { getUpcomingMeetings } from "@/app/_features/calendar/queries";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    display?: string;
    status?: string;
    tag?: string;
    company?: string;
  }>;
}) {
  const params = await searchParams;
  // Support both 'view' and 'display' params for backwards compatibility
  const viewParam = params.display || params.view;
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
    <ClientsPageClient
      clients={clients}
      upcomingMeetings={upcomingMeetings}
      tags={tags || []}
      companies={[]}
      initialView={viewParam as "table" | "grid" | "board" | undefined}
    />
  );
}
