import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { StudioHeader } from "./StudioHeader";
import { InboxFilters, InboxContent, InboxEmptyState } from "./inbox/components";
import { getInboxItems } from "./inbox/queries";
import { Inbox } from "lucide-react";
import type { InboxFilters as InboxFiltersType } from "./inbox/types";

export const dynamic = "force-dynamic";

/**
 * Studio Mode Inbox Page
 *
 * The unified attention hub showing items that need action:
 * - Overdue items (invoices, milestones)
 * - Unread messages
 * - Alerts (client health, SEO)
 * - Today's events
 * - Pending items (proposals awaiting response)
 *
 * This page replaces the old "Work" section. Entities (Clients, Projects)
 * are now accessed via their own nav items.
 */
export default async function StudioInboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    client?: string;
    project?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  const { studio, supabase } = await getStudioContext();

  // Build filters from search params
  const filters: InboxFiltersType = {
    clientId: params.client,
    projectId: params.project,
    type: params.type as InboxFiltersType["type"],
  };

  const hasFilters = !!(params.client || params.project || params.type);

  // Fetch inbox items
  const items = await getInboxItems(supabase, studio.id, filters);

  // Fetch counts for stats
  const { count: clientCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("studio_id", studio.id);

  const { count: projectCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("studio_id", studio.id);

  // Fetch clients and projects for filter dropdowns
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("studio_id", studio.id)
    .eq("status", "active")
    .order("name");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("studio_id", studio.id)
    .in("status", ["active", "in_progress"])
    .order("name");

  return (
    <div className="space-y-6">
      {/* Page Header - Personalized greeting with rotating subtitle */}
      <StudioHeader />

      {/* Inbox Header with Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Inbox
              {items.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({items.length})
                </span>
              )}
            </CardTitle>
            <InboxFilters
              clients={clients || []}
              projects={projects || []}
            />
          </div>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <InboxContent items={items} />
          ) : (
            <InboxEmptyState
              clientCount={clientCount || 0}
              projectCount={projectCount || 0}
              hasFilters={hasFilters}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
