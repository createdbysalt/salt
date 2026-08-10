/**
 * Pure helpers over a capture's stored gate_result JSONB.
 *
 * extractGateReason: the plain-language "why" for Kept Out / Watching rows.
 * keptOutCauseFromGateResult: rule-caused vs heuristic — the Kept Out
 * correction action keys off this (Connector Rules & Learning, P4):
 * rule-caused → remove the rule; heuristic → always-allow or one-off let-in.
 *
 * Pure module: safe for client components and Vitest.
 */

export type KeptOutCause = "rule" | "heuristic";

interface GateResultShape {
  gateResults?: Record<
    string,
    { action?: string; gate?: string; reason?: string } | null
  > | null;
}

function asShape(gateResult: unknown): GateResultShape | null {
  if (!gateResult || typeof gateResult !== "object") return null;
  return gateResult as GateResultShape;
}

/** Decisive gates first, in pipeline precedence order. */
const DECISIVE_GATE_KEYS = [
  "rules",
  "blocklist",
  "preIngest",
  "pre_ingest",
  "admission",
  "knownEntity",
  "known_entity",
] as const;

export function extractGateReason(gateResult: unknown): string | null {
  const gateResults = asShape(gateResult)?.gateResults;
  if (!gateResults || typeof gateResults !== "object") return null;

  // The deciding gate is the one whose result did not pass — check the
  // decisive gates first, then fall back to any recorded reason.
  for (const key of DECISIVE_GATE_KEYS) {
    const reason = gateResults[key]?.reason;
    if (typeof reason === "string" && reason.trim()) return reason;
  }
  for (const value of Object.values(gateResults)) {
    if (typeof value?.reason === "string" && value.reason.trim()) {
      return value.reason;
    }
  }
  return null;
}

export function keptOutCauseFromGateResult(
  gateResult: unknown,
): KeptOutCause {
  const gateResults = asShape(gateResult)?.gateResults;
  if (!gateResults || typeof gateResults !== "object") return "heuristic";

  // Explicit user rules (P2) and the legacy blocklist gate both mean the
  // capture was kept out by a rule the user can remove — not a score.
  if (gateResults.rules?.action === "drop") return "rule";
  if (gateResults.blocklist?.action === "drop") return "rule";
  return "heuristic";
}
