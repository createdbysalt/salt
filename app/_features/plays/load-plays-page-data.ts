import "server-only";

import {
  getPlayActivityPage,
  listQueuedPlayRuns,
  listAutoHandledPlayRuns,
  countPlaysRanToday,
} from "@/app/_features/plays/queries";
import { getPlaybooksV2ForWorkspace, type PlaybookV2QueryResult } from "@/app/_features/plays/playbooks/queries-v2";
import {
  listQueueFindings,
  countFindingsByState,
} from "@/app/_features/capture/queries/intelligence-findings";
import { DEFAULT_ACTIVITY_PAGE_SIZE } from "@/app/_features/plays/types";
import type { PlayActivityCounts, PlayActivityRunRow } from "@/app/_features/plays/types";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { PlayRunRow } from "@/app/_features/plays/types";

export type PlaysTab = "queue" | "playbooks" | "activity";

export type PlaysPageData = {
  initialQueue: PlayRunRow[];
  initialActivity: PlayActivityRunRow[];
  activityTotalCount: number;
  activityCounts: PlayActivityCounts;
  initialFindings: FindingWithContext[];
  autoHandledFindings: FindingWithContext[];
  autoHandledRuns: PlayRunRow[];
  findingCounts: { needs_you: number; auto_handled: number };
  playsRanToday: number;
  playbooksV2: PlaybookV2QueryResult | null;
  workspaceId: string | null;
};

const EMPTY_FINDING_COUNTS = { needs_you: 0, auto_handled: 0 };
const EMPTY_ACTIVITY_COUNTS: PlayActivityCounts = {
  completed: 0,
  decided: 0,
  inProgress: 0,
  needsAttention: 0,
};
export const AUTO_HANDLED_RECENT_DAYS = 7;

function recentAutoHandledSince(): Date {
  const since = new Date();
  since.setDate(since.getDate() - AUTO_HANDLED_RECENT_DAYS);
  return since;
}

export function parsePlaysTab(value: string | null | undefined): PlaysTab {
  if (value === "playbooks" || value === "activity") {
    return value;
  }
  return "queue";
}

export function emptyPlaysPageData(): PlaysPageData {
  return {
    initialQueue: [],
    initialActivity: [],
    activityTotalCount: 0,
    activityCounts: EMPTY_ACTIVITY_COUNTS,
    initialFindings: [],
    autoHandledFindings: [],
    autoHandledRuns: [],
    findingCounts: EMPTY_FINDING_COUNTS,
    playsRanToday: 0,
    playbooksV2: null,
    workspaceId: null,
  };
}

/**
 * Fetch only the data required for the active Plays tab.
 */
export async function loadPlaysPageData(options: {
  tab: PlaysTab;
  workspaceId: string | undefined;
}): Promise<PlaysPageData> {
  const { tab, workspaceId } = options;
  const base = emptyPlaysPageData();

  if (tab === "queue") {
    const autoHandledSince = recentAutoHandledSince();
    const [queueViews, needsYouFindings, autoHandledFindings, autoHandledRuns, findingCounts, playsRanToday] = await Promise.all([
      listQueuedPlayRuns(),
      listQueueFindings("needs_you"),
      listQueueFindings("auto_handled"),
      listAutoHandledPlayRuns(autoHandledSince),
      countFindingsByState(),
      countPlaysRanToday(),
    ]);

    return {
      ...base,
      initialQueue: queueViews,
      initialFindings: needsYouFindings,
      autoHandledFindings,
      autoHandledRuns,
      findingCounts: {
        ...findingCounts,
        auto_handled: findingCounts.auto_handled + autoHandledRuns.length,
      },
      playsRanToday,
      workspaceId: workspaceId ?? null,
    };
  }

  if (tab === "playbooks") {
    const playbooksV2 = await getPlaybooksV2ForWorkspace();

    return {
      ...base,
      playbooksV2,
      workspaceId: workspaceId ?? null,
    };
  }

  const activityPage = await getPlayActivityPage({
    page: 1,
    pageSize: DEFAULT_ACTIVITY_PAGE_SIZE,
  });
  return {
    ...base,
    initialActivity: activityPage.runs,
    activityTotalCount: activityPage.totalCount,
    activityCounts: activityPage.counts,
  };
}
