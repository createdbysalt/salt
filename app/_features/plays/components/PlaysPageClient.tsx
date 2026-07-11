"use client";

import type { ActivityEntryRow, PlaybookBlueprintView, PlayTemplateView, PlayerSlug } from "@/app/_features/plays/types";
import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { PlaysActivityView, PlaysTab } from "@/app/_features/plays/load-plays-page-data";
import type { PlayerContextRow } from "@/app/_features/plays/players/queries";
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
  initialQueueFilter: "needs_you" | "auto_handled";
  playerContexts: Record<PlayerSlug, PlayerContextRow | null>;
  workspaceId: string | null;
  keeperUnseenCount?: number;
};

const EMPTY_PLAYER_CONTEXTS = {} as Record<PlayerSlug, PlayerContextRow | null>;

export function PlaysPageClient(props: Props) {
  return (
    <PlaysPage
      initialTab={props.initialTab}
      initialActivityView={props.initialActivityView}
      initialQueueFilter={props.initialQueueFilter}
      initialData={{
        initialQueue: props.initialQueue,
        initialActivity: props.initialActivity,
        connectors: props.connectors ?? EMPTY_CONNECTORS,
        initialFindings: props.initialFindings,
        autoHandledFindings: props.autoHandledFindings,
        findingCounts: props.findingCounts,
        streamCaptures: props.streamCaptures,
        captureStats: props.captureStats,
        hasCaptureData: props.hasCaptureData,
        blueprints: props.blueprints,
        adoptedTemplates: props.adoptedTemplates,
        playerContexts: props.playerContexts ?? EMPTY_PLAYER_CONTEXTS,
        workspaceId: props.workspaceId ?? null,
        keeperUnseenCount: props.keeperUnseenCount ?? 0,
      }}
    />
  );
}

export { PlaysPageSkeleton };
