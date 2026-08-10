import type { ConnectorsPageData } from "@/app/_features/connectors";
import type { StreamCaptureSummary } from "@/app/_features/capture/types";
import type { CaptureDiscoveryStatus } from "@/app/_features/capture/queries";
import type { CaptureStreamCounts } from "@/app/_features/capture/utils/capture-stream-page-filter";
import type { AdmissionItem } from "@/app/_features/memory/queries/admission-decisions";
import type { CaptureScope } from "@/app/_lib/composio/capture-scope";
import type { CustomizeArea } from "@/app/_features/capture/adapters/rule-entities";
import type { DefaultPolicy } from "@/app/_features/capture/adapters/default-policy";
import type { ConnectorRule } from "@/app/_features/capture/services/rules-manager";
import type { AreaProofCounts } from "@/app/_features/capture/utils/gate-proof-counts";
import type { ResolvedGatePolicy } from "@/app/_features/capture/services/gates/gate-policy";

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

/** One intake area's slice of the Customize tab. */
export interface CustomizeAreaData {
  area: CustomizeArea;
  accounts: CustomizeAccountData[];
  /** Transparency layer: live-rendered seeded filters + curated gate copy. */
  policy: DefaultPolicy;
  /** Provider-scoped rules across this area's accounts. */
  rules: ConnectorRule[];
  /** S1 proof counts: last 7 days from capture_events.gate_action. */
  proof: AreaProofCounts | null;
  /** S1 "When it syncs" lines for this area's connected providers. */
  whenItSyncs: string[];
}

export interface CustomizeTabData {
  areas: CustomizeAreaData[];
  /** Workspace-wide rules (provider NULL) — editable on the "all" view. */
  workspaceRules: ConnectorRule[];
  /** Workspace gate policy (S3) — the email choices render beside their lines. */
  gatePolicy: ResolvedGatePolicy;
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
  /** Sources → Customize (2026-08-10): intake policy by area. */
  customize: CustomizeTabData | null;
};
