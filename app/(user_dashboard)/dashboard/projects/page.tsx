import { ProjectsPageClient } from "./ProjectsPageClient";
import { getStudioContext } from "@/libs/user-dashboard";
import { getProjectsWithMetrics } from "@/app/actions/projects/get-projects-with-metrics";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
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
    <ProjectsPageClient
      projects={projects}
      tags={tags || []}
    />
  );
}
