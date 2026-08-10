import "server-only";

import { getConnectorsPageData } from "@/app/_features/connectors/queries";
import {
  getCaptureStreamPage,
  getDiscoveryStatus,
  hasCaptures,
} from "@/app/_features/capture/queries";
import { getAdmissionDecisions } from "@/app/_features/memory/queries/admission-decisions";
import { DEFAULT_CAPTURE_STREAM_PAGE_SIZE } from "@/app/_features/capture/stream-constants";
import {
  parseSourcesTab,
  type SourcesTab,
} from "./sources-tab-routing";
import {
  EMPTY_CONNECTORS,
  type SourcesTabData,
} from "./sources-tab-data";

export type SourcesPageData = SourcesTabData;

export { parseSourcesTab };
export type { SourcesTab };

export function emptySourcesPageData(): SourcesPageData {
  return {
    connectors: EMPTY_CONNECTORS,
    streamCaptures: [],
    streamTotalCount: 0,
    streamCounts: null,
    hasCaptureData: false,
    workspaceId: null,
    keptOut: null,
    discovery: null,
  };
}

/**
 * Fetch only the data required for the active Sources tab.
 */
export async function loadSourcesPageData(options: {
  tab: SourcesTab;
  workspaceId: string | undefined;
}): Promise<SourcesPageData> {
  const { tab, workspaceId } = options;
  const base = emptySourcesPageData();

  if (tab === "connectors") {
    const connectors = await getConnectorsPageData();
    return {
      ...base,
      connectors: connectors ?? EMPTY_CONNECTORS,
      workspaceId: workspaceId ?? null,
    };
  }

  if (workspaceId) {
    const [streamPage, hasCaptureData, admissions, discovery] =
      await Promise.all([
        getCaptureStreamPage(workspaceId, {
          page: 1,
          pageSize: DEFAULT_CAPTURE_STREAM_PAGE_SIZE,
        }),
        hasCaptures(workspaceId),
        getAdmissionDecisions(workspaceId),
        getDiscoveryStatus(workspaceId),
      ]);

    return {
      ...base,
      streamCaptures: streamPage.captures,
      streamTotalCount: streamPage.totalCount,
      streamCounts: streamPage.counts,
      hasCaptureData,
      workspaceId,
      keptOut: {
        count: admissions.keptOutCount,
        sample: admissions.keptOutSample,
      },
      discovery,
    };
  }

  return { ...base, workspaceId: workspaceId ?? null };
}
