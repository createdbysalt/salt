import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { CaptureDiscoveryStatus } from "@/app/_features/capture/queries";
import type { AdmissionItem } from "@/app/_features/memory/queries/admission-decisions";

export const EMPTY_CONNECTORS: ConnectorsPageData = {
  workspaceId: null,
  catalog: [],
  connectors: {},
  settingsByConnector: {},
  captureByConnector: {},
};

export type CaptureStats = {
  total: number;
  added: number;
  found: number;
  autoRouted: number;
  pending: number;
  findingCreated?: number;
  noSignal?: number;
  awaitingScan?: number;
  scanError?: number;
};

export type KeptOutData = {
  count: number;
  sample: AdmissionItem[];
};

export type SourcesTabData = {
  connectors: ConnectorsPageData;
  streamCaptures: StreamCaptureSummary[];
  captureStats: CaptureStats | null;
  hasCaptureData: boolean;
  workspaceId: string | null;
  /** P11: Kept out moved from Memory Filter to Sources Activity. */
  keptOut: KeptOutData | null;
  /** 4.4: plan-tiered discovery cadence, shown honestly on Activity. */
  discovery: CaptureDiscoveryStatus | null;
};
