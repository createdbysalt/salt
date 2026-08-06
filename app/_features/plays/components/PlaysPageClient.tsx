"use client";

import type { ActivityEntryRow, HqBriefingData, PlayRunRow } from "@/app/_features/plays/types";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { PlaysActivityView, PlaysTab } from "@/app/_features/plays/load-plays-page-data";
import type { GroupedLearningEvidence } from "@/app/_features/plays/queries/learning-evidence";
import type { PlaybookV2QueryResult } from "@/app/_features/plays/playbooks/queries-v2";
import type { HqSideRailData } from "@/app/_features/hq/types";
import { PlaysPage } from "./PlaysPage";
import { PlaysPageSkeleton } from "./PlaysPageSkeleton";
import { EMPTY_CONNECTORS } from "../hooks/usePlaysTabCache";

type Props = {
  initialTab: PlaysTab;
  initialActivityView: PlaysActivityView;
  initialQueue: PlayRunRow[];
  initialActivity: ActivityEntryRow[];
  activityTotalCount?: number;
  connectors: ConnectorsPageData | null;
  initialFindings: FindingWithContext[];
  autoHandledFindings: FindingWithContext[];
  findingCounts: { needs_you: number; auto_handled: number };
  playsRanToday?: number;
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
  initialQueueFilter: "needs_you" | "auto_handled" | "learning";
  workspaceId: string | null;
  keeperUnseenCount?: number;
  sideRail?: HqSideRailData;
  briefing?: HqBriefingData;
};

export function PlaysPageClient(props: Props) {
  return (
    <PlaysPage
      initialTab={props.initialTab}
      initialActivityView={props.initialActivityView}
      initialQueueFilter={props.initialQueueFilter}
      initialData={{
        initialQueue: props.initialQueue,
        initialActivity: props.initialActivity,
        activityTotalCount: props.activityTotalCount ?? 0,
        connectors: props.connectors ?? EMPTY_CONNECTORS,
        initialFindings: props.initialFindings,
        autoHandledFindings: props.autoHandledFindings,
        findingCounts: props.findingCounts,
        playsRanToday: props.playsRanToday ?? 0,
        learningEvidence: props.learningEvidence,
        streamCaptures: props.streamCaptures,
        captureStats: props.captureStats,
        hasCaptureData: props.hasCaptureData,
        playbooksV2: props.playbooksV2,
        workspaceId: props.workspaceId ?? null,
        keeperUnseenCount: props.keeperUnseenCount ?? 0,
      }}
      sideRail={props.sideRail}
      briefing={props.briefing}
    />
  );
}

export { PlaysPageSkeleton };
