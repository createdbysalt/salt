import { getProjectsWithMetrics, type ProjectWithMetrics } from "@/app/actions/projects/get-projects-with-metrics";
import { ProjectsPageClient } from "./ProjectsPageClient";

export type ProjectViewFilter = "active" | "archived" | "deleted";

interface ProjectsPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const view = (params.view as ProjectViewFilter) || "active";

  const projects = await getProjectsWithMetrics({
    includeArchived: view === "archived",
    includeDeleted: view === "deleted",
  });

  // Filter based on view
  let filteredProjects: ProjectWithMetrics[];
  if (view === "archived") {
    filteredProjects = projects.filter((p) => p.archivedAt && !p.deletedAt);
  } else if (view === "deleted") {
    filteredProjects = projects.filter((p) => p.deletedAt);
  } else {
    filteredProjects = projects.filter((p) => !p.archivedAt && !p.deletedAt);
  }

  return <ProjectsPageClient initialProjects={filteredProjects} currentView={view} />;
}
