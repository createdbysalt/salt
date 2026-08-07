import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTenantContext } from "@/app/_lib/tenancy";
import {
  loadPlaysPageData,
  parsePlaysTab,
} from "@/app/_features/plays/load-plays-page-data";
import { PlaysPageClient } from "@/app/_features/plays/components/PlaysPageClient";
import { PlaysPageSkeleton } from "@/app/_features/plays/components/PlaysPageSkeleton";
import {
  parsePlaysQueueFilter,
  resolvePlaysLegacyRedirect,
} from "@/app/_features/plays/plays-tab-routing";
import { loadHqSideRailData } from "@/app/_features/hq/load-hq-dashboard-data";
import { getHqBriefingData } from "@/app/_features/hq/queries";

type SearchParams = Promise<{
  tab?: string;
  filter?: string;
  view?: string;
  customize?: string;
}>;

async function PlaysPageWithData({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  // Legacy URLs from before the Sources / Memory / Plays split.
  const legacyTarget = resolvePlaysLegacyRedirect({
    tab: params.tab ?? null,
    filter: params.filter ?? null,
    view: params.view ?? null,
    customize: params.customize ?? null,
  });
  if (legacyTarget) {
    redirect(legacyTarget);
  }

  const tab = parsePlaysTab(params.tab ?? null);
  const queueFilter = parsePlaysQueueFilter(params.filter ?? null);
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;

  const [data, sideRail, briefing] = await Promise.all([
    loadPlaysPageData({ tab, workspaceId }),
    loadHqSideRailData(),
    getHqBriefingData(),
  ]);

  return (
    <PlaysPageClient
      initialTab={tab}
      initialQueueFilter={queueFilter}
      initialQueue={data.initialQueue}
      initialActivity={data.initialActivity}
      activityTotalCount={data.activityTotalCount}
      initialFindings={data.initialFindings}
      autoHandledFindings={data.autoHandledFindings}
      autoHandledRuns={data.autoHandledRuns}
      findingCounts={data.findingCounts}
      playsRanToday={data.playsRanToday}
      playbooksV2={data.playbooksV2}
      workspaceId={data.workspaceId}
      keeperUnseenCount={data.keeperUnseenCount}
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
