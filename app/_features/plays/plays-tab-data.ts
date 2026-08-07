import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { ActivityEntryRow, PlayRunRow } from "@/app/_features/plays/types";
import type { PlaybookV2QueryResult } from "@/app/_features/plays/playbooks/queries-v2";

export type PlaysTabData = {
  initialQueue: PlayRunRow[];
  initialActivity: ActivityEntryRow[];
  activityTotalCount: number;
  initialFindings: FindingWithContext[];
  autoHandledFindings: FindingWithContext[];
  autoHandledRuns: PlayRunRow[];
  findingCounts: { needs_you: number; auto_handled: number };
  playsRanToday: number;
  playbooksV2: PlaybookV2QueryResult | null;
  workspaceId: string | null;
  keeperUnseenCount: number;
};
