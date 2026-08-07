import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";

export const EMPTY_CONNECTORS: ConnectorsPageData = {
  workspaceId: null,
  catalog: [],
  connectors: {},
  disabledToolsByConnector: {},
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

export type SourcesTabData = {
  connectors: ConnectorsPageData;
  streamCaptures: StreamCaptureSummary[];
  captureStats: CaptureStats | null;
  hasCaptureData: boolean;
  workspaceId: string | null;
};
