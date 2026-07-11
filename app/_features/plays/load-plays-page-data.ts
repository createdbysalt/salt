import "server-only";

import {
  listActivityEntries,
  listQueuedPlayRuns,
  listPlaybookBlueprints,
  listPlayTemplates,
} from "@/app/_features/plays/queries";
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
import { listPlayerContexts } from "@/app/_features/plays/players/queries";
import { getUnseenLearningsCount } from "@/app/_features/me/actions/salt-learnings";
import type { ActivityEntryRow, PlaybookBlueprintView, PlayTemplateView, PlayerSlug } from "@/app/_features/plays/types";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { QueuePlayView } from "@/app/_features/plays/types";
import type { PlayerContextRow } from "@/app/_features/plays/players/queries";

export type PlaysTab = "queue" | "customize" | "activity";
export type PlaysActivityView = "actions" | "captures";

export type PlaysPageData = {
  initialQueue: QueuePlayView[];
  initialActivity: ActivityEntryRow[];
  connectors: ConnectorsPageData | null;
  initialFindings: FindingWithContext[];
  autoHandledFindings: FindingWithContext[];
  findingCounts: { needs_you: number; auto_handled: number };
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
  blueprints: PlaybookBlueprintView[];
  adoptedTemplates: PlayTemplateView[];
  playerContexts: Record<PlayerSlug, PlayerContextRow | null>;
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
    connectors: null,
    initialFindings: [],
    autoHandledFindings: [],
    findingCounts: EMPTY_FINDING_COUNTS,
    streamCaptures: [],
    captureStats: null,
    hasCaptureData: false,
    blueprints: [],
    adoptedTemplates: [],
    playerContexts: {} as Record<PlayerSlug, PlayerContextRow | null>,
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
    const [queueViews, needsYouFindings, autoHandledFindings, findingCounts] = await Promise.all([
      listQueuedPlayRuns(),
      listQueueFindings("needs_you"),
      listQueueFindings("auto_handled"),
      countFindingsByState(),
    ]);

    return {
      ...base,
      initialQueue: queueViews,
      initialFindings: needsYouFindings,
      autoHandledFindings,
      findingCounts,
    };
  }

  if (tab === "customize") {
    const [connectors, blueprints, adoptedTemplates, playerContextList, keeperUnseenCount] = await Promise.all([
      getConnectorsPageData(),
      listPlaybookBlueprints(),
      listPlayTemplates(),
      workspaceId ? listPlayerContexts(workspaceId) : Promise.resolve([]),
      workspaceId ? getUnseenLearningsCount(workspaceId) : Promise.resolve(0),
    ]);

    const playerContexts = playerContextList.reduce(
      (acc, ctx) => {
        acc[ctx.player_slug as PlayerSlug] = ctx;
        return acc;
      },
      {} as Record<PlayerSlug, PlayerContextRow | null>,
    );

    return {
      ...base,
      connectors,
      blueprints,
      adoptedTemplates,
      playerContexts,
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

  const activityRows = await listActivityEntries();
  return {
    ...base,
    initialActivity: activityRows,
  };
}
