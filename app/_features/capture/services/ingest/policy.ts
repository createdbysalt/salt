import "server-only";

import type { CaptureEnvelope } from "../../adapters/types";
import type { CaptureState } from "../../types";
import type { GatePipelineResult } from "../../types/gate-result";

/**
 * Post-ingest lane policy (Memory Sourcing Overhaul, Phase 1).
 *
 * THE single place that decides what happens to a capture after the gate
 * pipeline: whether evidence runs, whether enrichment runs, and whether the
 * row gets a terminal intelligence stamp at insert. Every special case
 * (held / noise / budget / bootstrap / skipEvidence / email-vs-account-
 * scoped) is a named, tested branch here — never an inline flag check
 * scattered across the orchestrator.
 *
 * Note on DB truth: the capture_budget_enforcer trigger can stamp a row
 * `noise` between the budget peek and the insert. That is only knowable
 * post-insert, so the orchestrator re-checks the returned gate_action and
 * treats it as an additional noise override on top of these lanes.
 */
export interface LanePolicyInput {
  envelope: CaptureEnvelope;
  isBootstrap: boolean;
  skipEvidence: boolean;
  gateResult: GatePipelineResult | undefined;
  budgetExceeded: boolean;
}

export interface PostIngestLanes {
  /** Held mail (Memory-first): thin row, no evidence, no enrichment. */
  isHeld: boolean;
  /** Budget cap hit — row lands but is stamped noise. */
  forcedNoiseByBudget: boolean;
  /** Noise from the gate or the budget (pre-insert knowledge). */
  isNoise: boolean;
  captureState: CaptureState;
  overallConfidence: number | null;
  /**
   * Stamp `intelligence.outcome` at insert: `no_signal` for noise (terminal —
   * nothing revisits noise), `pending_backfill` for bootstrap/skip-evidence
   * rows the email-only scan can't reach (the nightly evidence-backfill cron
   * owns them), null when the normal lanes run.
   */
  terminalStamp: "no_signal" | "pending_backfill" | null;
  runEvidence: boolean;
  runEnrichment: boolean;
}

/** Sources the email-only daily scan can revisit (any-age backlog). */
const EMAIL_SCANNABLE_SOURCES = new Set(["gmail", "outlook"]);

export function decidePostIngestLanes(input: LanePolicyInput): PostIngestLanes {
  const { envelope, gateResult } = input;

  const isHeld = gateResult?.finalAction === "held";
  const forcedNoiseByBudget = input.budgetExceeded && !isHeld;
  const isNoise = forcedNoiseByBudget || gateResult?.finalAction === "noise";
  const captureState: CaptureState =
    gateResult?.finalAction === "signal" ? "routed" : "pending";
  const overallConfidence = gateResult?.targetEntity?.confidence ?? null;

  // Terminal stamping: noise rows never get scanned, so without a stamp they
  // render as "Processing" forever. Bootstrap/skip-evidence rows the
  // email-only daily scan can never reach (files, calendar, payments) get
  // `pending_backfill` instead of the old permanent `no_signal` — the
  // nightly evidence-backfill cron revisits them. Bootstrap EMAIL stays
  // unstamped on purpose — the scan backlog owns it.
  const isEmailScannable = EMAIL_SCANNABLE_SOURCES.has(envelope.sourceType);
  const skipsPipeline = input.skipEvidence || input.isBootstrap;
  const terminalStamp: PostIngestLanes["terminalStamp"] = isHeld
    ? null
    : isNoise
      ? "no_signal"
      : skipsPipeline && !isEmailScannable
        ? "pending_backfill"
        : null;

  // Evidence vs enrichment split (intake unclog): evidence classifiers are
  // deterministic (no LLM spend), so they run for every admitted capture —
  // including bootstrap email, whose birth-signals were previously lost
  // forever when the scan backlog never reached them. Enrichment (LLM
  // spend) still skips bootstrap; the scan backlog picks it up.
  const runEvidence = !isHeld && !input.skipEvidence && !isNoise;
  const runEnrichment =
    !isHeld && !input.skipEvidence && !input.isBootstrap && !isNoise;

  return {
    isHeld,
    forcedNoiseByBudget,
    isNoise,
    captureState,
    overallConfidence,
    terminalStamp,
    runEvidence,
    runEnrichment,
  };
}
