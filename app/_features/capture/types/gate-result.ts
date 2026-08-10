/**
 * Gate Result Types (Captures V2 Phase 2).
 *
 * Three-gate filtering model:
 * - Gate 1 (pre-ingest): Block obvious noise before creating captures
 * - Gate 2 (known-entity): Fast-track to known People/Orgs
 * - Gate 3 (admission): Score unknown senders for admission
 *
 * Memory-first email policy (Capture Quality Repair, Phase C): inbound email
 * from senders with no Memory match is "held" — stored as a thin row (sender,
 * subject, thread metadata), hidden from the stream, never enriched. The
 * relationship-discovery pass promotes held senders into Memory, after which
 * their mail flows as "signal" like any known entity.
 */

export type GateAction = "drop" | "signal" | "candidate" | "noise" | "held";

export interface EntityRef {
  surface: "people" | "organizations";
  entityId: string;
  matchType: "email" | "domain" | "name" | "prior_interaction";
  confidence: number;
}

export interface GateResultDrop {
  action: "drop";
  gate: "pre-ingest" | "blocklist" | "rules";
  reason: string;
  category: "spam" | "marketing" | "automated" | "blocklisted" | "blocked";
}

export interface GateResultSignal {
  action: "signal";
  gate: "known-entity";
  target: EntityRef;
  reason: string;
}

/**
 * Explicit user rule match (Connector Rules & Learning, P2). Runs before
 * every heuristic: deny drops, allow admits at full prominence — bypassing
 * the memory-first hold, known-entity lookup, and admission scoring.
 */
export interface GateResultRule {
  action: "drop" | "signal";
  gate: "rules";
  reason: string;
  /** Set on deny; allow matches have no noise category. */
  category?: "blocked";
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
    | "shared_file"
    | "intent_inquiry";
  weight: number;
  evidence?: string;
}

/**
 * Cold-inbound intent read (Sources Lane 1 discriminator). Recorded on the
 * gate result whether or not it changed the outcome, so Activity can answer
 * "why didn't Salt catch this email?" and the miss rate is queryable —
 * failure mode #1's early-warning instrumentation.
 */
export interface ColdIntentResult {
  /** False when the read was skipped (no content, spend refused, no key). */
  checked: boolean;
  genuineInquiry: boolean;
  /** Model confidence 0–1; admission requires genuineInquiry AND ≥ threshold. */
  confidence: number;
  reason: string;
}

export interface GatePipelineResult {
  finalAction: GateAction;
  gateResults: {
    rules?: GateResultRule | null;
    preIngest?: GateResultDrop | null;
    blocklist?: GateResultDrop | null;
    knownEntity?: GateResultSignal | null;
    admission?: GateResultCandidate | GateResultNoise | null;
  };
  passedGates: (
    | "rules"
    | "pre-ingest"
    | "blocklist"
    | "known-entity"
    | "admission"
  )[];
  shouldIngest: boolean;
  targetEntity?: EntityRef;
  coldIntent?: ColdIntentResult;
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
