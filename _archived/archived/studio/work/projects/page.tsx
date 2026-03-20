import { ProjectsPageClient } from "../../projects/ProjectsPageClient";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { getProjectsWithMetrics } from "@/app/_features/projects/queries";
import { WorkTabs } from "../../components/WorkTabs";
import { PageHeader } from "@repo/patterns";

export const dynamic = "force-dynamic";

/**
 * Studio Mode - Work → Projects View
 *
 * All active projects across clients.
 * Part of the Work multi-view section.
 */
export default async function WorkProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    client?: string;
    tag?: string;
  }>;
}) {
  const params = await searchParams;
  const { studio, supabase } = await getStudioContext();

  // Fetch projects with all metrics
  const projects = await getProjectsWithMetrics({
    type: params.type as "one-time" | "retainer" | undefined,
    clientId: params.client,
    tagIds: params.tag ? [params.tag] : undefined,
  });

  // Fetch all tags for filters
  const { data: tags } = await supabase
    .from("tags")
    .select("id, label, color")
    .eq("studio_id", studio.id)
    .eq("type", "project")
    .order("label");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work"
        description="Manage your projects, clients, and pipeline"
        noBorder
      />
      <WorkTabs />
      <ProjectsPageClient
        projects={projects}
        tags={tags || []}
      />
    </div>
  );
}
