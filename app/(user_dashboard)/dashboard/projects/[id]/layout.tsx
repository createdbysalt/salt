import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch project details
  const { data: project } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      status,
      created_at,
      client:clients(name)
    `)
    .eq("id", id)
    .single();

  if (!project) {
    redirect("/dashboard/projects");
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
