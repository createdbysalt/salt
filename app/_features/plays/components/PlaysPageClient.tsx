"use client";

import type { ActivityEntryRow } from "@/app/_features/plays/types";
import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import { PlaysPage } from "./PlaysPage";

type Props = {
  initialQueue: QueuePlay[];
  initialActivity: ActivityEntryRow[];
  connectors: ConnectorsPageData;
  initialFindings: FindingWithContext[];
  findingCounts: { needs_you: number; auto_handled: number };
};

export function PlaysPageClient({
  initialQueue,
  initialActivity,
  connectors,
  initialFindings,
  findingCounts,
}: Props) {
  return (
    <PlaysPage
      initialQueue={initialQueue}
      initialActivity={initialActivity}
      connectors={connectors}
      initialFindings={initialFindings}
      findingCounts={findingCounts}
    />
  );
}
