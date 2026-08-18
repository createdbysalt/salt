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

/**
 * Plain-language rendering of a stored gate reason for Kept Out rows
 * ("understandable at a glance"). Matches the known gate-reason prefixes
 * (pre-ingest, admission); anything unrecognized — including the user's own
 * rule reasons — passes through verbatim. Degrade to the original, never
 * to a lie.
 */
const PLAIN_REASON_MAP: Array<[RegExp, string]> = [
  [/^Cold inbound with no prior interaction/i, "First time you've heard from this sender"],
  [/^Low signal score/i, "Didn't look relevant to your work"],
  [/^List-Unsubscribe header/i, "Marketing or bulk mail"],
  [/^Precedence: .+ indicates bulk/i, "Bulk or mailing-list mail"],
  [/^Auto-Submitted: .+ indicates automated/i, "Automated message"],
  [/^Disposable email domain/i, "Sent from a disposable email address"],
  [/^Known marketing platform domain/i, "Sent via a marketing platform"],
  [/^No-reply domain/i, "Automated message"],
  [/^Automated sender address/i, "Automated sender"],
  [/^Gmail label indicates promotional/i, "Gmail marked it as promotional"],
];

export function plainKeptOutReason(reason: string | null): string | null {
  if (!reason) return null;
  for (const [pattern, plain] of PLAIN_REASON_MAP) {
    if (pattern.test(reason)) return plain;
  }
  return reason;
}
