import { getClientsWithMetrics, type ClientViewFilter } from "@/app/actions/clients/get-clients-with-metrics";
import { ClientsPageClient } from "./ClientsPageClient";
import type { Client } from "@/app/_features/clients/components";

interface ClientsPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const view = (params.view as ClientViewFilter) || "active";

  const clientsWithMetrics = await getClientsWithMetrics({ view });

  // Transform ClientWithMetrics to Client type for the data table
  const clients: Client[] = clientsWithMetrics.map((client) => ({
    id: client.id,
    name: client.name,
    contactEmail: client.contactEmail,
    contactPhone: client.contactPhone,
    company: client.company,
    status: (client.status as "active" | "invited" | "inactive") || "active",
    createdAt: client.createdAt,
    tags: client.tags,
    lifecycleStage: client.lifecycleStage,
    stageEnteredAt: client.stageEnteredAt,
    mrr: client.mrr,
    ltv: client.ltv,
    projectCount: client.projectCount,
    lastContactAt: client.lastContactAt,
  }));

  return <ClientsPageClient initialClients={clients} currentView={view} />;
}
