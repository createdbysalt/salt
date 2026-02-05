import { redirect } from "next/navigation";
import { getProjectDetail } from "@/app/_features/projects/queries";
import { ProjectHeader } from "@/app/_features/projects/components/project-header";
import { ProjectTabs } from "@/app/_features/projects/components/project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Use cached query - shared with page components for consistent auth context
  // during parallel RSC rendering
  const project = await getProjectDetail(id);

  if (!project) {
    // Project not found or user not authenticated
    redirect("/studio/projects");
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        projectId={project.id}
        projectName={project.name}
        clientName={(project.client as any)?.name}
        status={project.status}
        startDate={project.created_at}
      />

      <ProjectTabs projectId={project.id} />

      <div className="py-4">{children}</div>
    </div>
  );
}
