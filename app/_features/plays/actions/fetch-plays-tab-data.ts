"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import {
  loadPlaysPageData,
  parsePlaysTab,
  type PlaysPageData,
  type PlaysTab,
} from "../load-plays-page-data";
import type { PlaysTabData } from "../plays-tab-data";

function toPlaysTabData(data: PlaysPageData): PlaysTabData {
  return {
    initialQueue: data.initialQueue,
    initialActivity: data.initialActivity,
    activityTotalCount: data.activityTotalCount ?? 0,
    initialFindings: data.initialFindings,
    autoHandledFindings: data.autoHandledFindings,
    autoHandledRuns: data.autoHandledRuns,
    findingCounts: data.findingCounts,
    playsRanToday: data.playsRanToday ?? 0,
    playbooksV2: data.playbooksV2 ?? null,
    workspaceId: data.workspaceId ?? null,
    keeperUnseenCount: data.keeperUnseenCount ?? 0,
  };
}

export async function fetchPlaysTabData(input: {
  tab: PlaysTab;
}): Promise<PlaysTabData> {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;

  const data = await loadPlaysPageData({
    tab: input.tab,
    workspaceId,
  });

  return toPlaysTabData(data);
}

export async function fetchPlaysTabDataFromSearchParams(searchParams: {
  tab?: string | null;
}): Promise<PlaysTabData> {
  const tab = parsePlaysTab(searchParams.tab ?? null);
  return fetchPlaysTabData({ tab });
}
