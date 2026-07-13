"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import {
  loadPlaysPageData,
  parsePlaysActivityView,
  parsePlaysTab,
  type PlaysActivityView,
  type PlaysPageData,
  type PlaysTab,
} from "../load-plays-page-data";
import { mapQueuePlayForUi } from "../utils/map-queue-play";
import type { PlaysTabData } from "../plays-tab-data";
import { EMPTY_CONNECTORS } from "../plays-tab-data";

function toPlaysTabData(data: PlaysPageData): PlaysTabData {
  return {
    initialQueue: data.initialQueue.map(mapQueuePlayForUi),
    initialActivity: data.initialActivity,
    activityTotalCount: data.activityTotalCount ?? 0,
    connectors: data.connectors ?? EMPTY_CONNECTORS,
    initialFindings: data.initialFindings,
    autoHandledFindings: data.autoHandledFindings,
    findingCounts: data.findingCounts,
    learningEvidence: data.learningEvidence,
    streamCaptures: data.streamCaptures,
    captureStats: data.captureStats,
    hasCaptureData: data.hasCaptureData,
    blueprints: data.blueprints,
    adoptedTemplates: data.adoptedTemplates,
    playbooksV2: data.playbooksV2 ?? null,
    workspaceId: data.workspaceId ?? null,
    keeperUnseenCount: data.keeperUnseenCount ?? 0,
  };
}

export async function fetchPlaysTabData(input: {
  tab: PlaysTab;
  activityView?: PlaysActivityView;
}): Promise<PlaysTabData> {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  const activityView = input.activityView ?? "actions";

  const data = await loadPlaysPageData({
    tab: input.tab,
    activityView,
    workspaceId,
  });

  return toPlaysTabData(data);
}

export async function fetchPlaysTabDataFromSearchParams(searchParams: {
  tab?: string | null;
  view?: string | null;
}): Promise<PlaysTabData> {
  const tab = parsePlaysTab(searchParams.tab ?? null);
  const activityView = parsePlaysActivityView(searchParams.view ?? null);
  return fetchPlaysTabData({ tab, activityView });
}
