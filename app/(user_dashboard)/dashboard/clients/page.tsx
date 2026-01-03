import { getStudioContext } from "@/libs/user-dashboard";
import Link from "next/link";
import { ClientsPageClient } from "./ClientsPageClient";

export const dynamic = "force-dynamic";

// Helper to safely parse JSONB settings
function getClientSettings(settings: any) {
  if (!settings || typeof settings !== "object") {
    return {
      status: "active",
      revenue: null,
      lastContact: null,
      tagIds: [],
      contactName: null,
    };
  }
  return {
    status: settings.status || "active",
    revenue: settings.revenue || null,
    lastContact: settings.lastContact || null,
    tagIds: Array.isArray(settings.tagIds) ? settings.tagIds : [],
    contactName: settings.contactName || null,
  };
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const { studio, supabase } = await getStudioContext();

  // Build query
  let query = supabase
    .from("clients")
    .select("*")
    .eq("studio_id", studio.id)
    .order("created_at", { ascending: false });

  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_email.ilike.%${search}%`);
  }

  const { data: clientsRaw, error } = await query;

  if (error) {
    console.error("Error loading clients:", error);
  }

  // Get project counts per client
  const clientIds = clientsRaw?.map((c) => c.id) || [];
  let projectCounts: Record<string, number> = {};

  if (clientIds.length > 0) {
    const { data: projectCountsData } = await supabase
      .from("projects")
      .select("client_id")
      .in("client_id", clientIds);

    if (projectCountsData) {
      projectCountsData.forEach((p) => {
        projectCounts[p.client_id] = (projectCounts[p.client_id] || 0) + 1;
      });
    }
  }

  // Map clients to include parsed settings
  const clients = (clientsRaw || []).map((client) => {
    const settings = getClientSettings(client.settings);
    return {
      id: client.id,
      name: client.name,
      contactEmail: client.contact_email,
      contactPhone: client.contact_phone,
      createdAt: client.created_at,
      // From settings JSONB
      status: settings.status,
      revenue: settings.revenue,
      lastContact: settings.lastContact,
      tagIds: settings.tagIds,
      contactName: settings.contactName,
      // Computed
      projects: projectCounts[client.id] || 0,
    };
  });

  return (
    <ClientsPageClient
      clients={clients}
      initialSearch={search}
    />
  );
}
