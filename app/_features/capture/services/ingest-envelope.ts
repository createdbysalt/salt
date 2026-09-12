import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { classifyCaptureNoise } from "./intelligence/capture-noise";
import { runGatePipeline, type GatePipelineInput } from "./gates";
import { getCaptureGatePolicy } from "../actions/gate-policy";
import {
  getCaptureBudgetStatus,
  recordBudgetExceededWarning,
} from "./capture-budget";
import type { CaptureEnvelope } from "../adapters/types";
import type { GatePipelineResult } from "../types/gate-result";
import { decidePostIngestLanes } from "./ingest/policy";
import { applyTerminalCalendarUpdateStage } from "./ingest/stages/lifecycle";
import { maybeRunBookingSyncStage } from "./ingest/stages/booking";
import { persistCaptureStage } from "./ingest/stages/persist";
import { persistMessageStage } from "./ingest/stages/message-store";
import { runPostIngestStage } from "./ingest/stages/post-ingest";
import type {
  IngestEnvelopeOptions,
  IngestEnvelopeResult,
} from "./ingest/types";

/**
 * Generic capture ingestor (connector-platform Phase 3.3 + Captures V2 Phase 2).
 *
 * One write path for every capture source: adapter-normalized envelope →
 * gate pipeline (drop/signal/candidate/noise) → capture_events insert
 * (dedupe on the DB unique constraint) → evidence accumulation.
 *
 * Gate pipeline (Captures V2):
 * - Gate 1: Pre-ingest filter (spam, marketing, automated)
 * - Gate 2: Known-entity check (fast-track to existing People/Orgs)
 * - Gate 3: Admission scoring (signal vs noise for unknowns)
 *
 * The existing pipeline consumes rows exactly as before — routing engine,
 * classifiers, and play triggers are untouched by how items arrive.
 *
 * Structure (Memory Sourcing Overhaul, Phase 1): this orchestrator sequences
 * explicit stages; every lane decision lives in `ingest/policy.ts`.
 */

export type {
  IngestOutcome,
  IngestEnvelopeOptions,
  IngestEnvelopeResult,
} from "./ingest/types";

export async function ingestEnvelope(
  workspaceId: string,
  integrationId: string | null,
  envelope: CaptureEnvelope,
  options: IngestEnvelopeOptions = {},
): Promise<IngestEnvelopeResult> {
  let gateResult: GatePipelineResult | undefined;

  // Stage: calendar lifecycle (pre-gate in-place updates)
  if (
    await applyTerminalCalendarUpdateStage(
      workspaceId,
      envelope,
      options.userEmail ?? null,
    )
  ) {
    return { outcome: "updated" };
  }

  // Stage: booking fast path (pre-gate scheduling backfill)
  await maybeRunBookingSyncStage(
    workspaceId,
    envelope,
    options.awaitEnrichment ?? false,
  );

  // Stage: gates
  if (options.useGatePipeline) {
    const gatePolicy = await getCaptureGatePolicy(workspaceId);
    const gateInput: GatePipelineInput = {
      workspaceId,
      userEmail: options.userEmail ?? null,
      envelope,
      coldIntentRead: options.coldIntentRead ?? false,
      gatePolicy,
    };
    gateResult = await runGatePipeline(gateInput);

    if (!gateResult.shouldIngest) {
      return {
        outcome: "dropped",
        noiseReason:
          gateResult.gateResults.preIngest?.reason ??
          gateResult.gateResults.rules?.reason ??
          gateResult.gateResults.policy?.reason ??
          "Blocked by gate pipeline",
        gateResult,
      };
    }
  } else {
    if (envelope.noise) {
      const verdict = classifyCaptureNoise(envelope.noise);
      if (verdict.isNoise) {
        return { outcome: "noise", noiseReason: verdict.reason };
      }
    }
  }

  const admin = createAdminClient();

  // Daily capture budget (Phase 6): past the cap the row still lands, but is
  // stamped as noise — no enrichment fetch, no evidence, no LLM scan. Held
  // mail is already thin/unenriched and keeps its discovery semantics.
  //
  // This check is a racy peek (warning row + cheap pre-stamp); the
  // capture_budget_enforcer DB trigger re-checks atomically at insert and is
  // authoritative — the persist stage reads the returned gate_action, so a
  // row the trigger stamped is never enriched.
  const budget = await getCaptureBudgetStatus(workspaceId, admin);
  if (budget.exceeded) {
    await recordBudgetExceededWarning(workspaceId, budget, admin);
  }

  // Policy: every post-gate lane decision in one place
  const lanes = decidePostIngestLanes({
    envelope,
    isBootstrap: options.isBootstrap ?? false,
    skipEvidence: options.skipEvidence ?? false,
    gateResult,
    budgetExceeded: budget.exceeded,
  });

  // Stage: persist
  const persisted = await persistCaptureStage(
    admin,
    workspaceId,
    integrationId,
    envelope,
    options,
    gateResult,
    lanes,
  );
  if (persisted.kind === "duplicate") {
    return { outcome: "duplicate", gateResult };
  }
  if (persisted.kind === "error") {
    return { outcome: "error", error: persisted.error, gateResult };
  }

  if (lanes.isHeld) {
    // Held mail is invisible until the sender is promoted into Memory:
    // no evidence, no enrichment, no LLM spend.
    return { outcome: "held", captureId: persisted.captureId, gateResult };
  }

  // The DB trigger may have stamped the row noise (budget cap hit between
  // the peek above and the insert — the TOCTOU the trigger exists to
  // close). The returned row is truth: never enrich a stamped row.
  const effectiveNoise = lanes.isNoise || persisted.dbForcedNoise;

  // Stage: message store. Admitted message captures become threaded rows
  // with capped bodies — the learn-layer store that evidence extraction,
  // the intelligence scan, and Convos all read from. Held/noise captures
  // stay thin (privacy stance unchanged). Always awaited: these writes are
  // the sourcing record and must survive serverless freezes.
  if (!lanes.isHeld && !effectiveNoise) {
    try {
      await persistMessageStage(
        admin,
        workspaceId,
        persisted.captureId,
        envelope,
        options.userEmail ?? null,
      );
    } catch (messageStoreError) {
      console.warn(
        `[ingest-envelope] Message store failed for ${persisted.captureId}:`,
        messageStoreError instanceof Error
          ? messageStoreError.message
          : messageStoreError,
      );
    }
  }

  // Stage: post-ingest (evidence, enrichment, reply side effects)
  await runPostIngestStage({
    admin,
    workspaceId,
    userEmail: options.userEmail ?? null,
    captureId: persisted.captureId,
    envelope,
    gateResult,
    lanes,
    effectiveNoise,
    awaitAll: options.awaitEnrichment ?? false,
  });

  if (effectiveNoise) {
    return {
      outcome: "noise",
      noiseReason:
        lanes.forcedNoiseByBudget || persisted.dbForcedNoise
          ? `Daily capture budget exceeded (${budget.count}/${budget.limit} in 24h)`
          : (gateResult?.gateResults.admission?.reason ?? "Low signal score"),
      captureId: persisted.captureId,
      gateResult,
    };
  }

  return { outcome: "created", captureId: persisted.captureId, gateResult };
}
