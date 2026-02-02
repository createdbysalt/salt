import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getSeoConfig, getAudits, getSeoAlerts } from "@/app/_features/seo/actions";
import type { CoreWebVitals } from "@/app/_features/seo/types";
import { ProjectSeoDashboard } from "./ProjectSeoDashboard";

export default async function ProjectSeoPage({
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

  // Fetch latest Lighthouse audit with raw data for breakdown
  const auditsResult = await getAudits({
    projectId: id,
    limit: 1,
    includeRawData: true,
    auditType: "lighthouse",
  });
  const latestAudit = auditsResult.ok && auditsResult.data.audits.length > 0
    ? auditsResult.data.audits[0]
    : null;

  // Fetch latest CrUX audit data
  const cruxResult = await getAudits({
    projectId: id,
    limit: 1,
    includeRawData: true,
    auditType: "crux",
  });
  const latestCrux = cruxResult.ok && cruxResult.data.audits.length > 0 && cruxResult.data.audits[0].rawData
    ? (cruxResult.data.audits[0].rawData as unknown as CoreWebVitals)
    : null;

  // Fetch Lighthouse audit history for trends chart (up to 100 audits, no raw data needed)
  const auditHistoryResult = await getAudits({
    projectId: id,
    limit: 100,
    includeRawData: false,
    auditType: "lighthouse",
  });
  const auditHistory = auditHistoryResult.ok ? auditHistoryResult.data.audits : [];

  // Fetch undismissed SEO alerts for this project
  const alertsResult = await getSeoAlerts({ projectId: id });
  const alerts = alertsResult.ok ? alertsResult.data.alerts : [];

  return (
    <ProjectSeoDashboard
      projectId={id}
      projectName={project.name}
      seoConfig={seoConfig}
      initialAudit={latestAudit}
      auditHistory={auditHistory}
      initialCrux={latestCrux}
      alerts={alerts}
    />
  );
}
