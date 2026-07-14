import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { classifyCaptureNoise } from "./intelligence/capture-noise";
import { processCaptureForEvidence } from "@/app/_features/memory/evidence";
import { runGatePipeline, type GatePipelineInput } from "./gates";
import { enrichAndPersist } from "./enrichment";
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

export type IngestOutcome = "created" | "duplicate" | "noise" | "dropped" | "error";

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

  const isNoise = gateResult?.finalAction === "noise";
  const captureState: CaptureState = gateResult?.finalAction === "signal" ? "routed" : "pending";
  const overallConfidence = gateResult?.targetEntity?.confidence ?? null;

  const admin = createAdminClient();
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
      extracted_data: envelope.extracted as never,
      state: captureState,
      overall_confidence: overallConfidence,
      is_bootstrap: options.isBootstrap ?? false,
      gate_action: gateResult?.finalAction ?? null,
      gate_result: gateResult ? (gateResult as unknown as Record<string, unknown>) : null,
    } as never)
    .select("id")
    .single();

  if (!error && data) {
    if (!options.skipEvidence && !options.isBootstrap && !isNoise) {
      processCaptureForEvidence(data.id).catch((err) => {
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

      enrichAndPersist(data.id, envelope, {
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
    }

    if (isNoise) {
      return {
        outcome: "noise",
        noiseReason: gateResult?.gateResults.admission?.reason ?? "Low signal score",
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
