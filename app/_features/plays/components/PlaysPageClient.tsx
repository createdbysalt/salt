"use client";

import type { ActivityEntryRow, PlaybookBlueprintView, PlayTemplateView } from "@/app/_features/plays/types";
import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { PlaysActivityView, PlaysTab } from "@/app/_features/plays/load-plays-page-data";
import { PlaysPage } from "./PlaysPage";
import { PlaysPageSkeleton } from "./PlaysPageSkeleton";
import { EMPTY_CONNECTORS } from "../hooks/usePlaysTabCache";

type Props = {
  initialTab: PlaysTab;
  initialActivityView: PlaysActivityView;
  initialQueue: QueuePlay[];
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

export function PlaysPageClient(props: Props) {
  return (
    <PlaysPage
      initialTab={props.initialTab}
      initialActivityView={props.initialActivityView}
      initialData={{
        initialQueue: props.initialQueue,
        initialActivity: props.initialActivity,
        connectors: props.connectors ?? EMPTY_CONNECTORS,
        initialFindings: props.initialFindings,
        findingCounts: props.findingCounts,
        streamCaptures: props.streamCaptures,
        captureStats: props.captureStats,
        hasCaptureData: props.hasCaptureData,
        blueprints: props.blueprints,
        adoptedTemplates: props.adoptedTemplates,
      }}
    />
  );
}

export { PlaysPageSkeleton };
