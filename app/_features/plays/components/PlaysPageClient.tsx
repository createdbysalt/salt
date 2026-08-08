"use client";

import type { ActivityEntryRow, HqBriefingData, PlayRunRow } from "@/app/_features/plays/types";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { PlaysTab } from "@/app/_features/plays/load-plays-page-data";
import type { PlaybookV2QueryResult } from "@/app/_features/plays/playbooks/queries-v2";
import type { HqSideRailData } from "@/app/_features/hq/types";
import { PlaysPage } from "./PlaysPage";
import { PlaysPageSkeleton } from "./PlaysPageSkeleton";

type Props = {
  initialTab: PlaysTab;
  initialQueue: PlayRunRow[];
  initialActivity: ActivityEntryRow[];
  activityTotalCount?: number;
  initialFindings: FindingWithContext[];
  autoHandledFindings: FindingWithContext[];
  autoHandledRuns: PlayRunRow[];
  findingCounts: { needs_you: number; auto_handled: number };
  playsRanToday?: number;
  playbooksV2: PlaybookV2QueryResult | null;
  initialQueueFilter: "needs_you" | "auto_handled";
  workspaceId: string | null;
  sideRail?: HqSideRailData;
  briefing?: HqBriefingData;
};

export function PlaysPageClient(props: Props) {
  return (
    <PlaysPage
      initialTab={props.initialTab}
      initialQueueFilter={props.initialQueueFilter}
      initialData={{
        initialQueue: props.initialQueue,
        initialActivity: props.initialActivity,
        activityTotalCount: props.activityTotalCount ?? 0,
        initialFindings: props.initialFindings,
        autoHandledFindings: props.autoHandledFindings,
        autoHandledRuns: props.autoHandledRuns,
        findingCounts: props.findingCounts,
        playsRanToday: props.playsRanToday ?? 0,
        playbooksV2: props.playbooksV2,
        workspaceId: props.workspaceId ?? null,
      }}
      sideRail={props.sideRail}
      briefing={props.briefing}
    />
  );
}

export { PlaysPageSkeleton };
