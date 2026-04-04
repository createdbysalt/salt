import { Suspense } from "react";
import { Skeleton } from "@repo/ui";
import { getClientsWithMetrics } from "@/app/actions/clients/get-clients-with-metrics";
import { ClientsPageClient } from "../ClientsPageClient";

// View filter type matching ClientsPageClient expectation
type PageViewFilter = "active" | "archived" | "deleted";

// Loading skeleton for the directory
function DirectorySkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-4 w-px mx-2" />
        <Skeleton className="h-4 w-16" />
      </header>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-7 w-24 ml-3" />
        <div className="flex-1" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>

      {/* Table skeleton */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DirectoryPageProps {
  searchParams: Promise<{
    view?: string;
  }>;
}

async function DirectoryContent({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const viewFilter = (searchParams.view as PageViewFilter) || "active";
  const clients = await getClientsWithMetrics({ view: viewFilter });

  // Map to the expected Client type
  const mappedClients = clients.map((client) => ({
    id: client.id,
    name: client.name,
    contactEmail: client.contactEmail,
    contactPhone: client.contactPhone,
    company: client.company,
    status: client.status as "active" | "invited" | "inactive",
    createdAt: client.createdAt,
    lastContactAt: client.lastContactAt,
    projectCount: client.projectCount,
    mrr: client.mrr,
    ltv: client.ltv,
    tags: client.tags,
    lifecycleStage: client.lifecycleStage,
    stageEnteredAt: client.stageEnteredAt,
    archivedAt: client.archivedAt,
    deletedAt: client.deletedAt,
  }));

  return (
    <ClientsPageClient
      initialClients={mappedClients}
      currentView={viewFilter}
      companies={[]}
    />
  );
}

export default async function ClientsDirectoryPage({
  searchParams,
}: DirectoryPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <DirectoryContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}
