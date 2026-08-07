import type { CaptureState } from "../../types";

/** Outcome of the intelligence scan for a capture (Plays-era model). */
export type CaptureIntelligenceOutcome =
  | "awaiting_scan"
  | "no_signal"
  | "finding_created"
  | "scan_error"
  | "routed"
  | "dismissed";

export interface CaptureIntelligenceMeta {
  outcome: Exclude<
    CaptureIntelligenceOutcome,
    "awaiting_scan" | "routed" | "dismissed"
  >;
  scanned_at: string;
  finding_id?: string;
}

export interface CaptureFindingLink {
  finding_id: string;
  finding_type: string;
  finding_state: string;
}

/** Findings that still appear as an active Plays / ledger link. */
export const ACTIVE_LEDGER_FINDING_STATES = new Set(["needs_you", "auto_handled"]);

export function isActiveLedgerFindingLink(
  link: CaptureFindingLink | null | undefined
): link is CaptureFindingLink {
  return Boolean(link && ACTIVE_LEDGER_FINDING_STATES.has(link.finding_state));
}

export function mergeIntelligenceMeta(
  extractedData: unknown,
  meta: CaptureIntelligenceMeta
): Record<string, unknown> {
  const base =
    extractedData && typeof extractedData === "object" && !Array.isArray(extractedData)
      ? { ...(extractedData as Record<string, unknown>) }
      : {};
  return { ...base, intelligence: meta };
}

/**
 * Whether a capture should be classified again during scan.
 *
 * Scan policy (capture-pipeline repair, Phase 6): the LLM gets at most one
 * look. `no_signal` is terminal — re-analyzing it on every scan burned model
 * spend on rows already judged (either by the gate pipeline at ingest or by
 * a previous scan). `scan_error` stays retryable (transient failures should
 * heal). An explicit `rescan` (dev/manual) overrides both.
 */
export function shouldReanalyzeCapture(
  meta: CaptureIntelligenceMeta | null,
  options: { rescan?: boolean } = {}
): boolean {
  if (options.rescan) return true;
  if (!meta) return true;
  return meta.outcome === "scan_error";
}

export function readIntelligenceMeta(
  extractedData: unknown
): CaptureIntelligenceMeta | null {
  if (!extractedData || typeof extractedData !== "object" || Array.isArray(extractedData)) {
    return null;
  }
  const intelligence = (extractedData as Record<string, unknown>).intelligence;
  if (!intelligence || typeof intelligence !== "object" || Array.isArray(intelligence)) {
    return null;
  }
  const row = intelligence as Record<string, unknown>;
  const outcome = row.outcome;
  if (
    outcome !== "no_signal" &&
    outcome !== "finding_created" &&
    outcome !== "scan_error"
  ) {
    return null;
  }
  const scannedAt = row.scanned_at;
  if (typeof scannedAt !== "string") {
    return null;
  }
  return {
    outcome,
    scanned_at: scannedAt,
    finding_id: typeof row.finding_id === "string" ? row.finding_id : undefined,
  };
}

export function resolveCaptureIntelligenceOutcome(input: {
  intelligenceMeta: CaptureIntelligenceMeta | null;
  findingLink: CaptureFindingLink | null;
  routingState: CaptureState;
}): CaptureIntelligenceOutcome {
  if (isActiveLedgerFindingLink(input.findingLink)) {
    return "finding_created";
  }

  if (input.intelligenceMeta?.outcome === "no_signal") {
    return "no_signal";
  }
  if (input.intelligenceMeta?.outcome === "scan_error") {
    return "scan_error";
  }
  if (input.intelligenceMeta?.outcome === "finding_created") {
    // Scanned and linked before, but finding was dismissed/acted — treat as no signal.
    return "no_signal";
  }
  if (input.routingState === "routed") {
    return "routed";
  }
  if (input.routingState === "dismissed") {
    return "dismissed";
  }
  return "awaiting_scan";
}

export const INTELLIGENCE_OUTCOME_LABELS: Record<CaptureIntelligenceOutcome, string> = {
  awaiting_scan: "Awaiting scan",
  no_signal: "No signal",
  finding_created: "Finding created",
  scan_error: "Scan error",
  routed: "Routed to Memory",
  dismissed: "Dismissed",
};

export const INTELLIGENCE_OUTCOME_DETAIL: Record<CaptureIntelligenceOutcome, string> = {
  awaiting_scan: "Not analyzed yet — run Scan on Plays",
  no_signal: "Scanned — nothing actionable for Plays",
  finding_created: "Linked to a Plays finding",
  scan_error: "Scan could not read this capture",
  routed: "Routed via legacy Memory flow",
  dismissed: "Dismissed from Capture queue",
};

/** Stream filter ids aligned with intelligence outcomes (real capture data). */
export type IntelligenceStreamFilter =
  | "all"
  | "awaiting_scan"
  | "no_signal"
  | "finding_created"
  | "scan_error";

/**
 * New simplified capture categories for user-facing UI.
 * Maps the technical intelligence outcomes to user-friendly categories.
 */
export type CaptureCategory = "queued" | "no-signal" | "processing" | "error";

export const CAPTURE_CATEGORY_LABELS: Record<CaptureCategory, string> = {
  queued: "Triggered Play",
  "no-signal": "No Action",
  processing: "Processing",
  error: "Error",
};

export const CAPTURE_CATEGORY_DETAIL: Record<CaptureCategory, string> = {
  queued: "Triggered a play — check Plays",
  "no-signal": "Salt reviewed, no action needed",
  processing: "Still being analyzed",
  error: "Couldn't process this capture",
};

/**
 * Map intelligence outcome to user-facing category.
 */
export function mapOutcomeToCategory(outcome: CaptureIntelligenceOutcome): CaptureCategory {
  switch (outcome) {
    case "finding_created":
      return "queued";
    case "no_signal":
    case "routed":
    case "dismissed":
      return "no-signal";
    case "awaiting_scan":
      return "processing";
    case "scan_error":
      return "error";
  }
}

/**
 * Derive capture category from enriched metadata.
 * The new enrichment system is the source of truth when available.
 *
 * "Triggered Play" (queued) is only truthful when a play was actually
 * dispatched (aligned with isTriggeredCapture in capture-priority.ts).
 * Merely receiving an email or matching generic signals is not a trigger.
 */
export function categoryFromEnrichment(
  enrichedMetadata: {
    enriched_at?: string | null;
    signals_matched?: string[];
    linked_records?: unknown[];
    plays_dispatched?: unknown[];
  } | null | undefined,
  fallbackOutcome: CaptureIntelligenceOutcome
): CaptureCategory {
  // If no enrichment data, fall back to old intelligence outcome
  if (!enrichedMetadata?.enriched_at) {
    return mapOutcomeToCategory(fallbackOutcome);
  }

  const signals = enrichedMetadata.signals_matched ?? [];

  // Noise-classified email never counts as a trigger, regardless of what
  // other signals matched.
  if (signals.includes("email_classified_noise")) {
    return "no-signal";
  }

  const dispatched = enrichedMetadata.plays_dispatched ?? [];
  if (dispatched.length > 0) {
    return "queued";
  }

  // Enriched but nothing dispatched — Salt reviewed, no action taken.
  return "no-signal";
}
