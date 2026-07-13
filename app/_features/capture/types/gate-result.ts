/**
 * Gate Result Types (Captures V2 Phase 2).
 *
 * Three-gate filtering model:
 * - Gate 1 (pre-ingest): Block obvious noise before creating captures
 * - Gate 2 (known-entity): Fast-track to known People/Orgs
 * - Gate 3 (admission): Score unknown senders for admission
 */

export type GateAction = "drop" | "signal" | "candidate" | "noise";

export interface EntityRef {
  surface: "people" | "organizations";
  entityId: string;
  matchType: "email" | "domain" | "name" | "prior_interaction";
  confidence: number;
}

export interface GateResultDrop {
  action: "drop";
  gate: "pre-ingest" | "blocklist";
  reason: string;
  category: "spam" | "marketing" | "automated" | "blocklisted" | "blocked";
}

export interface GateResultSignal {
  action: "signal";
  gate: "known-entity";
  target: EntityRef;
  reason: string;
}

export interface GateResultCandidate {
  action: "candidate";
  gate: "admission";
  confidence: number;
  signals: AdmissionSignal[];
  reason: string;
}

export interface GateResultNoise {
  action: "noise";
  gate: "admission";
  reason: string;
  category: "cold_inbound" | "no_reply" | "low_signal";
}

export type GateResult =
  | GateResultDrop
  | GateResultSignal
  | GateResultCandidate
  | GateResultNoise;

export interface AdmissionSignal {
  type:
    | "you_initiated"
    | "they_replied"
    | "bidirectional"
    | "calendar_meeting"
    | "payment_customer"
    | "shared_file";
  weight: number;
  evidence?: string;
}

export interface GatePipelineResult {
  finalAction: GateAction;
  gateResults: {
    preIngest?: GateResultDrop | null;
    blocklist?: GateResultDrop | null;
    knownEntity?: GateResultSignal | null;
    admission?: GateResultCandidate | GateResultNoise | null;
  };
  passedGates: ("pre-ingest" | "blocklist" | "known-entity" | "admission")[];
  shouldIngest: boolean;
  targetEntity?: EntityRef;
}

export interface PreIngestGateInput {
  senderEmail: string | null;
  senderDomain: string | null;
  headers: {
    listUnsubscribe?: string | null;
    precedence?: string | null;
    xMailer?: string | null;
    autoSubmitted?: string | null;
  };
  labels?: string[];
}

export interface KnownEntityGateInput {
  workspaceId: string;
  senderEmail: string | null;
  senderDomain: string | null;
  senderName: string | null;
}

export interface AdmissionGateInput {
  workspaceId: string;
  userEmail: string | null;
  senderEmail: string | null;
  threadId: string | null;
  isReply: boolean;
  youInitiated: boolean;
  hasCalendarMeeting: boolean;
  hasPayment: boolean;
  hasSharedFile: boolean;
}
