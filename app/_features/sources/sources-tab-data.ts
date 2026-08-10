import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { CaptureDiscoveryStatus } from "@/app/_features/capture/queries";
import type { CaptureStreamCounts } from "@/app/_features/capture/utils/capture-stream-page-filter";
import type { AdmissionItem } from "@/app/_features/memory/queries/admission-decisions";

export const EMPTY_CONNECTORS: ConnectorsPageData = {
  workspaceId: null,
  catalog: [],
  connectors: {},
  settingsByConnector: {},
  captureByConnector: {},
};

export type KeptOutData = {
  count: number;
  sample: AdmissionItem[];
};

export type SourcesTabData = {
  connectors: ConnectorsPageData;
  /** First page of the capture stream (page 1, default page size). */
  streamCaptures: StreamCaptureSummary[];
  /** Exact stream-wide row count for numbered pagination. */
  streamTotalCount: number;
  /** All-time stat-tile counts for the stream header strip. */
  streamCounts: CaptureStreamCounts | null;
  hasCaptureData: boolean;
  workspaceId: string | null;
  /** P11: Kept out moved from Memory Filter to Sources Activity. */
  keptOut: KeptOutData | null;
  /** 4.4: plan-tiered discovery cadence, shown honestly on Activity. */
  discovery: CaptureDiscoveryStatus | null;
};
