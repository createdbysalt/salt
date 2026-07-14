import "server-only";

import {
  listActivityEntries,
  listQueuedPlayRuns,
} from "@/app/_features/plays/queries";
import { getPlaybooksV2ForWorkspace, type PlaybookV2QueryResult } from "@/app/_features/plays/playbooks/queries-v2";
import { getConnectorsPageData } from "@/app/_features/connectors/queries";
import {
  getCaptureStream,
  getTodayCaptureStats,
  hasCaptures,
} from "@/app/_features/capture/queries";
import {
  listQueueFindings,
  countFindingsByState,
} from "@/app/_features/capture/queries/intelligence-findings";
import { getLearningEvidence } from "@/app/_features/plays/queries/learning-evidence";
import { getUnseenLearningsCount } from "@/app/_features/me/actions/salt-learnings";
import type { ActivityEntryRow } from "@/app/_features/plays/types";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { PlayRunRow } from "@/app/_features/plays/types";
import type { GroupedLearningEvidence } from "@/app/_features/plays/queries/learning-evidence";

export type PlaysTab = "queue" | "customize" | "activity";
export type PlaysActivityView = "actions" | "captures";

export type PlaysPageData = {
  initialQueue: PlayRunRow[];
  initialActivity: ActivityEntryRow[];
  activityTotalCount: number;
  connectors: ConnectorsPageData | null;
  initialFindings: FindingWithContext[];
  autoHandledFindings: FindingWithContext[];
  findingCounts: { needs_you: number; auto_handled: number };
  learningEvidence: GroupedLearningEvidence[];
  streamCaptures: StreamCaptureSummary[];
  captureStats: {
    total: number;
    added: number;
    found: number;
    autoRouted: number;
    pending: number;
    findingCreated?: number;
    noSignal?: number;
    awaitingScan?: number;
    scanError?: number;
  } | null;
  hasCaptureData: boolean;
  playbooksV2: PlaybookV2QueryResult | null;
  workspaceId: string | null;
  keeperUnseenCount: number;
};

const EMPTY_FINDING_COUNTS = { needs_you: 0, auto_handled: 0 };
export const AUTO_HANDLED_RECENT_DAYS = 7;

function recentAutoHandledSince(): Date {
  const since = new Date();
  since.setDate(since.getDate() - AUTO_HANDLED_RECENT_DAYS);
  return since;
}

export function parsePlaysTab(value: string | null | undefined): PlaysTab {
  if (value === "customize" || value === "activity") {
    return value;
  }
  return "queue";
}

export function parsePlaysActivityView(value: string | null | undefined): PlaysActivityView {
  if (value === "captures" || value === "stream") {
    return "captures";
  }
  return "actions";
}

export function emptyPlaysPageData(): PlaysPageData {
  return {
    initialQueue: [],
    initialActivity: [],
    activityTotalCount: 0,
    connectors: null,
    initialFindings: [],
    autoHandledFindings: [],
    findingCounts: EMPTY_FINDING_COUNTS,
    learningEvidence: [],
    streamCaptures: [],
    captureStats: null,
    hasCaptureData: false,
    playbooksV2: null,
    workspaceId: null,
    keeperUnseenCount: 0,
  };
}

/**
 * Fetch only the data required for the active Plays tab/view.
 */
export async function loadPlaysPageData(options: {
  tab: PlaysTab;
  activityView: PlaysActivityView;
  workspaceId: string | undefined;
}): Promise<PlaysPageData> {
  const { tab, activityView, workspaceId } = options;
  const base = emptyPlaysPageData();

  if (tab === "queue") {
    const autoHandledSince = recentAutoHandledSince();
    const [queueViews, needsYouFindings, autoHandledFindings, findingCounts, learningEvidence] = await Promise.all([
      listQueuedPlayRuns(),
      listQueueFindings("needs_you"),
      listQueueFindings("auto_handled"),
      countFindingsByState(),
      workspaceId ? getLearningEvidence(workspaceId) : Promise.resolve([]),
    ]);

    return {
      ...base,
      initialQueue: queueViews,
      initialFindings: needsYouFindings,
      autoHandledFindings,
      findingCounts,
      learningEvidence,
      workspaceId: workspaceId ?? null,
    };
  }

  if (tab === "customize") {
    const [connectors, playbooksV2, keeperUnseenCount] = await Promise.all([
      getConnectorsPageData(),
      getPlaybooksV2ForWorkspace(),
      workspaceId ? getUnseenLearningsCount(workspaceId) : Promise.resolve(0),
    ]);

    return {
      ...base,
      connectors,
      playbooksV2,
      workspaceId: workspaceId ?? null,
      keeperUnseenCount,
    };
  }

  if (activityView === "captures" && workspaceId) {
    const [streamCaptures, captureStats, hasCaptureData] = await Promise.all([
      getCaptureStream(workspaceId, { limit: 100 }),
      getTodayCaptureStats(workspaceId),
      hasCaptures(workspaceId),
    ]);

    return {
      ...base,
      streamCaptures,
      captureStats,
      hasCaptureData,
    };
  }

  const { entries: activityRows, totalCount: activityTotalCount } = await listActivityEntries(0, 50);
  return {
    ...base,
    initialActivity: activityRows,
    activityTotalCount,
  };
}
