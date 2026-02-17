import { ClientsPageClient } from "./ClientsPageClient";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { getClientsWithMetrics, getClientViewCounts } from "@/app/_features/workspace/queries";
import type { ClientViewFilter } from "@/app/_features/workspace/queries";
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
    filter?: string; // "active" | "archived" | "deleted"
  }>;
}) {
  const params = await searchParams;
  // Support both 'view' and 'display' params for backwards compatibility
  const viewParam = params.display || params.view;
  // Client filter: active, archived, or deleted
  const clientFilter = (params.filter as ClientViewFilter) || "active";
  const { studio, supabase } = await getStudioContext();

  // Fetch clients with all metrics and view counts in parallel
  const [clients, viewCounts] = await Promise.all([
    getClientsWithMetrics({
      status: params.status as "active" | "inactive" | undefined,
      tagIds: params.tag ? [params.tag] : undefined,
      view: clientFilter,
    }),
    getClientViewCounts(),
  ]);

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
      clientFilter={clientFilter}
      viewCounts={viewCounts}
    />
  );
}
