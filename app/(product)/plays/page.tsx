import { Suspense } from "react";
import { getTenantContext } from "@/app/_lib/tenancy";
import {
  loadPlaysPageData,
  parsePlaysActivityView,
  parsePlaysTab,
} from "@/app/_features/plays/load-plays-page-data";
import { PlaysPageClient } from "@/app/_features/plays/components/PlaysPageClient";
import { PlaysPageSkeleton } from "@/app/_features/plays/components/PlaysPageSkeleton";
import { mapQueuePlayForUi } from "@/app/_features/plays/utils/map-queue-play";
import { parsePlaysQueueFilter } from "@/app/_features/plays/plays-tab-routing";

type SearchParams = Promise<{ tab?: string; filter?: string; view?: string }>;

async function PlaysPageWithData({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tab = parsePlaysTab(params.tab ?? null);
  const activityView = parsePlaysActivityView(params.view ?? null);
  const queueFilter = parsePlaysQueueFilter(params.filter ?? null);
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;

  const data = await loadPlaysPageData({ tab, activityView, workspaceId });

  return (
    <PlaysPageClient
      initialTab={tab}
      initialActivityView={activityView}
      initialQueueFilter={queueFilter}
      initialQueue={data.initialQueue.map(mapQueuePlayForUi)}
      initialActivity={data.initialActivity}
      connectors={data.connectors}
      initialFindings={data.initialFindings}
      autoHandledFindings={data.autoHandledFindings}
      findingCounts={data.findingCounts}
      streamCaptures={data.streamCaptures}
      captureStats={data.captureStats}
      hasCaptureData={data.hasCaptureData}
      blueprints={data.blueprints}
      adoptedTemplates={data.adoptedTemplates}
    />
  );
}

export default function PlaysRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<PlaysPageSkeleton />}>
      <PlaysPageWithData searchParams={searchParams} />
    </Suspense>
  );
}
