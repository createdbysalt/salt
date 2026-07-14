import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { ActivityEntryRow, PlayRunRow } from "@/app/_features/plays/types";
import type { GroupedLearningEvidence } from "@/app/_features/plays/queries/learning-evidence";
import type { PlaybookV2QueryResult } from "@/app/_features/plays/playbooks/queries-v2";

export const EMPTY_CONNECTORS: ConnectorsPageData = {
  workspaceId: null,
  catalog: [],
  connectors: {},
  disabledToolsByConnector: {},
  settingsByConnector: {},
  captureByConnector: {},
};

export type PlaysTabData = {
  initialQueue: PlayRunRow[];
  initialActivity: ActivityEntryRow[];
  activityTotalCount: number;
  connectors: ConnectorsPageData;
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
