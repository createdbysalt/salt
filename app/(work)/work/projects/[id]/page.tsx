import { getProjectDetail } from "@/app/_features/projects/queries";
import { notFound } from "next/navigation";
import { ProjectDetailPageClient } from "./ProjectDetailPageClient";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const project = await getProjectDetail(id);

  if (!project) {
    notFound();
  }

  return (
    <ProjectDetailPageClient
      project={project}
      activeTab={tab}
    />
  );
}
