import { notFound } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getSeoConfig } from "@/app/_features/seo/actions";
import { ProjectSettingsClient } from "./ProjectSettingsClient";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Establish auth context for RLS (layout handles the redirect for unauthenticated users)
  await supabase.auth.getUser();

  // Fetch project name for the settings form
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .single();

  // Layout handles redirect for missing projects, but use notFound() as fallback
  if (!project) {
    notFound();
  }

  // Fetch SEO configuration
  const seoConfigResult = await getSeoConfig({ projectId: id });
  const seoConfig = seoConfigResult.ok ? seoConfigResult.data : null;

  return (
    <ProjectSettingsClient
      projectId={id}
      projectName={project.name}
      initialSeoConfig={seoConfig}
    />
  );
}
