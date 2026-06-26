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
import type { ActivityEntryRow, PlaybookBlueprintView, PlayTemplateView } from "@/app/_features/plays/types";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { QueuePlayView } from "@/app/_features/plays/types";

export type PlaysTab = "queue" | "customize" | "activity";
export type PlaysActivityView = "actions" | "captures";

export type PlaysPageData = {
  initialQueue: QueuePlayView[];
  initialActivity: ActivityEntryRow[];
  connectors: ConnectorsPageData | null;
  initialFindings: FindingWithContext[];
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
};

const EMPTY_FINDING_COUNTS = { needs_you: 0, auto_handled: 0 };

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
    findingCounts: EMPTY_FINDING_COUNTS,
    streamCaptures: [],
    captureStats: null,
    hasCaptureData: false,
    blueprints: [],
    adoptedTemplates: [],
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
    const [queueViews, needsYouFindings, findingCounts] = await Promise.all([
      listQueuedPlayRuns(),
      listQueueFindings("needs_you"),
      countFindingsByState(),
    ]);

    return {
      ...base,
      initialQueue: queueViews,
      initialFindings: needsYouFindings,
      findingCounts,
    };
  }

  if (tab === "customize") {
    const [connectors, blueprints, adoptedTemplates] = await Promise.all([
      getConnectorsPageData(),
      listPlaybookBlueprints(),
      listPlayTemplates(),
    ]);

    return {
      ...base,
      connectors,
      blueprints,
      adoptedTemplates,
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
