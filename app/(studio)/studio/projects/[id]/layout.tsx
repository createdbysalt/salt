import { getProject } from "@/app/_features/projects/queries";
import { notFound } from "next/navigation";
import { ProjectDetailHeader } from "./ProjectDetailHeader";

interface ProjectDetailLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailLayout({
  children,
  params,
}: ProjectDetailLayoutProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full">
      <ProjectDetailHeader project={project} />
      <div className="relative flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
