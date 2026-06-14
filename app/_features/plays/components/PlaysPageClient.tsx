"use client";

import { Suspense } from "react";
import type { ActivityEntryRow } from "@/app/_features/plays/types";
import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import { PlaysPage } from "./PlaysPage";
import { PlaysPageSkeleton } from "./PlaysPageSkeleton";

type Props = {
  initialQueue: QueuePlay[];
  initialActivity: ActivityEntryRow[];
  connectors: ConnectorsPageData;
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
};

export function PlaysPageClient({
  initialQueue,
  initialActivity,
  connectors,
  initialFindings,
  findingCounts,
  streamCaptures,
  captureStats,
  hasCaptureData,
}: Props) {
  return (
    <Suspense fallback={<PlaysPageSkeleton />}>
      <PlaysPage
        initialQueue={initialQueue}
        initialActivity={initialActivity}
        connectors={connectors}
        initialFindings={initialFindings}
        findingCounts={findingCounts}
        streamCaptures={streamCaptures}
        captureStats={captureStats}
        hasCaptureData={hasCaptureData}
      />
    </Suspense>
  );
}
