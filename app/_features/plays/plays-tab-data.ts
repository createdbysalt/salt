import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { ActivityEntryRow, PlaybookBlueprintView, PlayTemplateView, PlayerSlug } from "@/app/_features/plays/types";
import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { PlayerContextRow } from "@/app/_features/plays/players/queries";

export const EMPTY_CONNECTORS: ConnectorsPageData = {
  workspaceId: null,
  catalog: [],
  connectors: {},
  disabledToolsByConnector: {},
  settingsByConnector: {},
  captureByConnector: {},
};

export type PlaysTabData = {
  initialQueue: QueuePlay[];
  initialActivity: ActivityEntryRow[];
  connectors: ConnectorsPageData;
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
