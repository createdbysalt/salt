import { redirect } from "next/navigation";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Verify project exists and belongs to user's studio
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!project) {
    redirect("/studio/projects");
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
