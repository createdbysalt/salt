import { ProjectsPageClient } from "./ProjectsPageClient";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { getProjectsWithMetrics } from "@/app/_features/projects/queries";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    client?: string;
    tag?: string;
    display?: string;
  }>;
}) {
  const params = await searchParams;
  const viewParam = params.display;
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
      initialView={viewParam as "grid" | "list" | "board" | "timeline" | undefined}
    />
  );
}
