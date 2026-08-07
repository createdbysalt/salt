import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { classifyCaptureNoise } from "./intelligence/capture-noise";
import { processCaptureForEvidence } from "@/app/_features/memory/evidence";
import { runGatePipeline, type GatePipelineInput } from "./gates";
import { enrichAndPersist } from "./enrichment";
import { promoteRepliedRecipients } from "./relationship-discovery";
import { recordOutboundReplies } from "./sender-reputation";
import { mergeIntelligenceMeta } from "./intelligence/capture-intelligence-outcome";
import {
  getCaptureBudgetStatus,
  recordBudgetExceededWarning,
} from "./capture-budget";
import type { CaptureEnvelope } from "../adapters/types";
import type { CaptureOrigin, CaptureState } from "../types";
import type { GatePipelineResult } from "../types/gate-result";

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
 */

export type IngestOutcome = "created" | "duplicate" | "noise" | "held" | "dropped" | "error";

/**
 * Held rows (Memory-first email policy) store only what the discovery pass
 * and the digest need — sender, subject, thread metadata. No body content,
 * no recipients, no attachments; held mail is never enriched or scanned, so
 * nothing downstream reads more than this.
 */
const HELD_EXTRACTED_KEYS = [
  "subject",
  "sender_email",
  "sender_name",
  "thread_id",
  "is_reply",
  "labels",
  "deep_link",
] as const;

function thinHeldExtracted(extracted: Record<string, unknown>): Record<string, unknown> {
  const thin: Record<string, unknown> = {};
  for (const key of HELD_EXTRACTED_KEYS) {
    if (extracted[key] !== undefined) thin[key] = extracted[key];
  }
  return thin;
}

export interface IngestEnvelopeOptions {
  isBootstrap?: boolean;
  /** Origin for the row; trigger/webhook arrivals are "found". */
  origin?: CaptureOrigin;
  /** Skip evidence accumulation (for bulk imports). */
  skipEvidence?: boolean;
  /** User's email for gate pipeline context. */
  userEmail?: string | null;
  /** Enable new gate pipeline (Captures V2). Default: false for backward compat. */
  useGatePipeline?: boolean;
  /**
   * Await evidence + enrichment before returning. Serverless callers (the
   * Composio webhook route) must set this — fire-and-forget work is killed
   * when the function instance freezes after the response, leaving captures
   * without enriched_metadata ("Processing" forever).
   */
  awaitEnrichment?: boolean;
}

export interface IngestEnvelopeResult {
  outcome: IngestOutcome;
  noiseReason?: string;
  error?: string;
  captureId?: string;
  gateResult?: GatePipelineResult;
}

export async function ingestEnvelope(
  workspaceId: string,
  integrationId: string | null,
  envelope: CaptureEnvelope,
  options: IngestEnvelopeOptions = {},
): Promise<IngestEnvelopeResult> {
  let gateResult: GatePipelineResult | undefined;

  if (options.useGatePipeline) {
    const gateInput: GatePipelineInput = {
      workspaceId,
      userEmail: options.userEmail ?? null,
      envelope,
    };
    gateResult = await runGatePipeline(gateInput);

    if (!gateResult.shouldIngest) {
      return {
        outcome: "dropped",
        noiseReason: gateResult.gateResults.preIngest?.reason ?? "Blocked by gate pipeline",
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
  const budget = await getCaptureBudgetStatus(workspaceId, admin);
  if (budget.exceeded) {
    await recordBudgetExceededWarning(workspaceId, budget, admin);
  }

  const isHeld = gateResult?.finalAction === "held";
  const forcedNoiseByBudget = budget.exceeded && !isHeld;
  const isNoise =
    forcedNoiseByBudget || gateResult?.finalAction === "noise";
  const captureState: CaptureState = gateResult?.finalAction === "signal" ? "routed" : "pending";
  const overallConfidence = gateResult?.targetEntity?.confidence ?? null;

  // Noise rows skip enrichment and scanning by design; without a terminal
  // intelligence outcome they render as "Processing" forever in the stream.
  // Stamp no_signal at insert — terminal unless an explicit rescan is
  // requested (Phase 6 scan policy: the LLM gets at most one look).
  // Held rows (Memory-first) store a thin extract only — sender/subject/thread.
  const extractedData = isHeld
    ? thinHeldExtracted(envelope.extracted as Record<string, unknown>)
    : isNoise
      ? mergeIntelligenceMeta(envelope.extracted, {
          outcome: "no_signal",
          scanned_at: new Date().toISOString(),
        })
      : envelope.extracted;

  const gateResultForRow = gateResult
    ? ({
        ...gateResult,
        ...(forcedNoiseByBudget ? { budgetExceeded: true } : {}),
      } as unknown as Record<string, unknown>)
    : forcedNoiseByBudget
      ? ({ budgetExceeded: true } as Record<string, unknown>)
      : null;

  const { data, error } = await admin
    .from("capture_events")
    .insert({
      workspace_id: workspaceId,
      source_type: envelope.sourceType,
      source_connection_id: integrationId,
      source_external_id: envelope.externalId,
      capture_type: envelope.captureType,
      origin: options.origin ?? ("found" as CaptureOrigin),
      title: envelope.title,
      raw_payload: envelope.raw as never,
      extracted_data: extractedData as never,
      state: captureState,
      overall_confidence: overallConfidence,
      is_bootstrap: options.isBootstrap ?? false,
      gate_action: forcedNoiseByBudget
        ? "noise"
        : (gateResult?.finalAction ?? null),
      gate_result: gateResultForRow,
    } as never)
    .select("id")
    .single();

  if (!error && data) {
    if (isHeld) {
      // Held mail is invisible until the sender is promoted into Memory:
      // no evidence, no enrichment, no LLM spend.
      return { outcome: "held", captureId: data.id, gateResult };
    }

    if (!options.skipEvidence && !options.isBootstrap && !isNoise) {
      const evidencePromise = processCaptureForEvidence(data.id).catch((err) => {
        console.warn(
          `[ingest-envelope] Evidence processing failed for ${data.id}:`,
          err instanceof Error ? err.message : err
        );
      });

      // Extract admission signals from gate result for criteria engine
      const admissionResult = gateResult?.gateResults.admission;
      const admissionSignals = admissionResult && "signals" in admissionResult
        ? admissionResult.signals
        : undefined;
      const admissionScore = admissionResult && "confidence" in admissionResult
        ? admissionResult.confidence
        : undefined;

      const enrichmentPromise = enrichAndPersist(data.id, envelope, {
        workspaceId,
        userEmail: options.userEmail ?? null,
        admissionSignals,
        admissionScore,
      }).catch((err) => {
        console.warn(
          `[ingest-envelope] Enrichment failed for ${data.id}:`,
          err instanceof Error ? err.message : err
        );
      });

      // Reply loops (Memory-first + Phase C2): outbound mail is the strongest
      // engagement signal. Promote held recipients into Memory right away and
      // bump each recipient's sender reputation so it self-builds without UI.
      const extracted = envelope.extracted as Record<string, unknown>;
      const sideEffects = [evidencePromise, enrichmentPromise];
      if (
        envelope.captureType === "message" &&
        extracted?.isSentByUser === true &&
        Array.isArray(extracted.to) &&
        extracted.to.length > 0
      ) {
        const recipients = extracted.to as string[];
        sideEffects.push(
          promoteRepliedRecipients(workspaceId, recipients)
            .then(() => undefined)
            .catch((err) => {
              console.warn(
                `[ingest-envelope] Reply fast-path failed for ${data.id}:`,
                err instanceof Error ? err.message : err
              );
            }),
          recordOutboundReplies(workspaceId, recipients).catch((err) => {
            console.warn(
              `[ingest-envelope] Sender reputation update failed for ${data.id}:`,
              err instanceof Error ? err.message : err
            );
          })
        );
      }

      if (options.awaitEnrichment) {
        await Promise.all(sideEffects);
      }
    }

    if (isNoise) {
      return {
        outcome: "noise",
        noiseReason: forcedNoiseByBudget
          ? `Daily capture budget exceeded (${budget.count}/${budget.limit} in 24h)`
          : (gateResult?.gateResults.admission?.reason ?? "Low signal score"),
        captureId: data.id,
        gateResult,
      };
    }

    return { outcome: "created", captureId: data.id, gateResult };
  }
  if (error?.code === "23505") {
    return { outcome: "duplicate", gateResult };
  }
  console.error(
    `[ingest-envelope] insert failed for ${envelope.sourceType}/${envelope.externalId}:`,
    error?.message,
  );
  return { outcome: "error", error: `${error?.code}: ${error?.message}`, gateResult };
}
