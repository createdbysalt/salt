import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { CaptureDiscoveryStatus } from "@/app/_features/capture/queries";
import type { CaptureStreamCounts } from "@/app/_features/capture/utils/capture-stream-page-filter";
import type { AdmissionItem } from "@/app/_features/memory/queries/admission-decisions";
import type { CaptureScope } from "@/app/_lib/composio/capture-scope";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";
import type { DefaultPolicy } from "@/app/_features/capture/adapters/default-policy";
import type { ConnectorRule } from "@/app/_features/capture/services/rules-manager";

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

/** One connected, capture-capable account on the Customize tab. */
export interface CustomizeAccountData {
  provider: string;
  /** Connector display name ("Gmail"). */
  name: string;
  /** Account label ("sarah@acme.com") when known. */
  label: string | null;
  captureEnabled: boolean;
  scope: CaptureScope | null;
}

/** One capture category's slice of the Customize tab. */
export interface CustomizeCategoryData {
  category: ConnectorCategory;
  accounts: CustomizeAccountData[];
  /** Transparency layer: live-rendered seeded filters + curated gate copy. */
  policy: DefaultPolicy;
  /** Provider-scoped rules across this category's accounts. */
  rules: ConnectorRule[];
}

export interface CustomizeTabData {
  categories: CustomizeCategoryData[];
  /** Workspace-wide rules (provider NULL) — editable on the "all" view. */
  workspaceRules: ConnectorRule[];
}

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
  /** Sources → Customize (2026-08-10): intake policy by capture category. */
  customize: CustomizeTabData | null;
};
