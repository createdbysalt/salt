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
 * Re-analyzes never-scanned, no_signal, and scan_error captures so new
 * intelligence rules (e.g. Memory proposals) can surface on the next run.
 */
export function shouldReanalyzeCapture(
  meta: CaptureIntelligenceMeta | null,
  options: { rescan?: boolean } = {}
): boolean {
  if (options.rescan) return true;
  if (!meta) return true;
  return meta.outcome === "no_signal" || meta.outcome === "scan_error";
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
 */
export function categoryFromEnrichment(
  enrichedMetadata: { enriched_at?: string | null; signals_matched?: string[]; linked_records?: unknown[] } | null | undefined,
  fallbackOutcome: CaptureIntelligenceOutcome
): CaptureCategory {
  // If no enrichment data, fall back to old intelligence outcome
  if (!enrichedMetadata?.enriched_at) {
    return mapOutcomeToCategory(fallbackOutcome);
  }

  // Enrichment completed - determine category from results
  const signals = enrichedMetadata.signals_matched ?? [];
  const linkedRecords = enrichedMetadata.linked_records ?? [];

  // If we have meaningful signals or linked records, it's queued for review
  const hasActionableSignals = signals.some((s) =>
    s.startsWith("capture_email_received") ||
    s.startsWith("capture_calendar_") ||
    s.includes("is_reply") ||
    s.includes("invoice") ||
    s.includes("payment")
  );

  if (hasActionableSignals || linkedRecords.length > 0) {
    return "queued";
  }

  // Enriched but no actionable signals
  return "no-signal";
}
