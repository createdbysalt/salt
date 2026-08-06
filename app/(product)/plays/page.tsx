import { Suspense } from "react";
import { getTenantContext } from "@/app/_lib/tenancy";
import {
  loadPlaysPageData,
  parsePlaysActivityView,
  parsePlaysTab,
} from "@/app/_features/plays/load-plays-page-data";
import { PlaysPageClient } from "@/app/_features/plays/components/PlaysPageClient";
import { PlaysPageSkeleton } from "@/app/_features/plays/components/PlaysPageSkeleton";
import { parsePlaysQueueFilter } from "@/app/_features/plays/plays-tab-routing";
import { loadHqSideRailData } from "@/app/_features/hq/load-hq-dashboard-data";
import { getHqBriefingData } from "@/app/_features/hq/queries";

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

  const [data, sideRail, briefing] = await Promise.all([
    loadPlaysPageData({ tab, activityView, workspaceId }),
    loadHqSideRailData(),
    getHqBriefingData(),
  ]);

  return (
    <PlaysPageClient
      initialTab={tab}
      initialActivityView={activityView}
      initialQueueFilter={queueFilter}
      initialQueue={data.initialQueue}
      initialActivity={data.initialActivity}
      activityTotalCount={data.activityTotalCount}
      connectors={data.connectors}
      initialFindings={data.initialFindings}
      autoHandledFindings={data.autoHandledFindings}
      findingCounts={data.findingCounts}
      playsRanToday={data.playsRanToday}
      learningEvidence={data.learningEvidence}
      streamCaptures={data.streamCaptures}
      captureStats={data.captureStats}
      hasCaptureData={data.hasCaptureData}
      playbooksV2={data.playbooksV2}
      workspaceId={data.workspaceId}
      sideRail={sideRail}
      briefing={briefing}
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
