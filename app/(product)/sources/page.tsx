import { Suspense } from "react";
import { getTenantContext } from "@/app/_lib/tenancy";
import {
  loadSourcesPageData,
  parseSourcesTab,
} from "@/app/_features/sources/load-sources-page-data";
import { SourcesPage } from "@/app/_features/sources/components/SourcesPage";
import { SourcesPageSkeleton } from "@/app/_features/sources/components/SourcesPageSkeleton";

type SearchParams = Promise<{ tab?: string; connector?: string }>;

async function SourcesPageWithData({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tab = parseSourcesTab(params.tab ?? null);
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;

  const data = await loadSourcesPageData({ tab, workspaceId });

  return <SourcesPage initialTab={tab} initialData={data} />;
}

export default function SourcesRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<SourcesPageSkeleton />}>
      <SourcesPageWithData searchParams={searchParams} />
    </Suspense>
  );
}
