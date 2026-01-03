import { getStudioContext } from "@/libs/user-dashboard";
import Link from "next/link";
import { ProjectsPageClient } from "./ProjectsPageClient";

export const dynamic = "force-dynamic";

// Helper to safely parse JSONB metadata
function getProjectMetadata(metadata: any) {
  if (!metadata || typeof metadata !== "object") {
    return {
      isRecurring: false,
      monthlyValue: null,
      includedHours: null,
      usedHours: null,
      renewalDate: null,
      healthStatus: null,
      totalValue: null,
      deadline: null,
      tagIds: [],
    };
  }
  return {
    isRecurring: metadata.isRecurring || metadata.is_recurring || false,
    monthlyValue: metadata.monthlyValue || metadata.monthly_value || null,
    includedHours: metadata.includedHours || metadata.included_hours || null,
    usedHours: metadata.usedHours || metadata.used_hours || null,
    renewalDate: metadata.renewalDate || metadata.renewal_date || null,
    healthStatus: metadata.healthStatus || metadata.health_status || null,
    totalValue: metadata.totalValue || metadata.total_value || null,
    deadline: metadata.deadline || null,
    tagIds: Array.isArray(metadata.tagIds) || Array.isArray(metadata.tag_ids)
      ? metadata.tagIds || metadata.tag_ids
      : [],
  };
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; client?: string; status?: string }>;
}) {
  const { search, client: clientFilter, status } = await searchParams;
  const { studio, supabase } = await getStudioContext();

  // Get clients for filter dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("studio_id", studio.id)
    .order("name");

  // Build query
  let query = supabase
    .from("projects")
    .select("*, clients(name)")
    .eq("studio_id", studio.id)
    .order("updated_at", { ascending: false });

  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (clientFilter) {
    query = query.eq("client_id", clientFilter);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: projectsRaw, error } = await query;

  if (error) {
    console.error("Error loading projects:", error);
  }

  // Map projects to include parsed metadata
  const projects = (projectsRaw || []).map((project) => {
    const metadata = getProjectMetadata(project.metadata);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      projectType: project.project_type,
      clientId: project.client_id,
      clientName: (project.clients as any)?.name || "No client",
      updatedAt: project.updated_at,
      // From metadata JSONB
      isRecurring: metadata.isRecurring,
      monthlyValue: metadata.monthlyValue,
      includedHours: metadata.includedHours,
      usedHours: metadata.usedHours,
      renewalDate: metadata.renewalDate,
      healthStatus: metadata.healthStatus,
      totalValue: metadata.totalValue,
      deadline: metadata.deadline,
      tagIds: metadata.tagIds,
    };
  });

  return (
    <ProjectsPageClient
      projects={projects}
      clients={clients || []}
      initialSearch={search}
      initialClientFilter={clientFilter}
      initialStatusFilter={status}
    />
  );
}
