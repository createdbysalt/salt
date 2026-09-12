import "server-only";

import type { createAdminClient } from "@/app/_lib/supabase/admin";
import { processCaptureForEvidence } from "@/app/_features/memory/evidence";
import type { CaptureEnvelope } from "../../../adapters/types";
import type { GatePipelineResult } from "../../../types/gate-result";
import { enrichAndPersist } from "../../enrichment";
import { mergeIntelligenceMeta } from "../../intelligence/capture-intelligence-outcome";
import { promoteRepliedRecipients } from "../../relationship-discovery";
import { recordOutboundReplies } from "../../sender-reputation";
import type { PostIngestLanes } from "../policy";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface PostIngestInput {
  admin: AdminClient;
  workspaceId: string;
  userEmail: string | null;
  captureId: string;
  envelope: CaptureEnvelope;
  gateResult: GatePipelineResult | undefined;
  lanes: PostIngestLanes;
  /**
   * Noise from the lanes OR stamped by the budget DB trigger post-insert.
   * Effective-noise rows never run evidence or enrichment.
   */
  effectiveNoise: boolean;
  /** Await all side effects before returning (serverless callers). */
  awaitAll: boolean;
}

/**
 * Post-ingest stage: evidence accumulation, enrichment, and outbound-reply
 * side effects. Every branch is failure-isolated — a throwing lane logs and
 * never fails the ingest.
 */
export async function runPostIngestStage(input: PostIngestInput): Promise<void> {
  const { admin, workspaceId, userEmail, captureId, envelope, gateResult, lanes } = input;

  if (input.effectiveNoise || !lanes.runEvidence) return;

  const evidencePromise = processCaptureForEvidence(captureId).catch((err) => {
    console.warn(
      `[ingest/post-ingest] Evidence processing failed for ${captureId}:`,
      err instanceof Error ? err.message : err,
    );
  });

  const sideEffects: Promise<unknown>[] = [evidencePromise];

  if (lanes.runEnrichment) {
    // Extract admission signals from gate result for criteria engine
    const admissionResult = gateResult?.gateResults.admission;
    const admissionSignals =
      admissionResult && "signals" in admissionResult
        ? admissionResult.signals
        : undefined;
    const admissionScore =
      admissionResult && "confidence" in admissionResult
        ? admissionResult.confidence
        : undefined;

    const enrichmentPromise = enrichAndPersist(captureId, envelope, {
      workspaceId,
      userEmail,
      admissionSignals,
      admissionScore,
    }).catch(async (err) => {
      console.warn(
        `[ingest/post-ingest] Enrichment failed for ${captureId}:`,
        err instanceof Error ? err.message : err,
      );
      // Surface the failure as Error (retryable) instead of leaving the
      // row in "Processing" forever. A later successful scan overwrites.
      try {
        const { data: current } = await admin
          .from("capture_events")
          .select("extracted_data")
          .eq("id", captureId)
          .single();
        await admin
          .from("capture_events")
          .update({
            extracted_data: mergeIntelligenceMeta(current?.extracted_data, {
              outcome: "scan_error",
              scanned_at: new Date().toISOString(),
            }) as never,
          })
          .eq("id", captureId);
      } catch (stampError) {
        console.warn(
          `[ingest/post-ingest] Error-stamp failed for ${captureId}:`,
          stampError instanceof Error ? stampError.message : stampError,
        );
      }
    });

    sideEffects.push(enrichmentPromise);

    // Reply loops (Memory-first + Phase C2): outbound mail is the strongest
    // engagement signal. Promote held recipients into Memory right away and
    // bump each recipient's sender reputation so it self-builds without UI.
    const extracted = envelope.extracted as Record<string, unknown>;
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
              `[ingest/post-ingest] Reply fast-path failed for ${captureId}:`,
              err instanceof Error ? err.message : err,
            );
          }),
        recordOutboundReplies(workspaceId, recipients).catch((err) => {
          console.warn(
            `[ingest/post-ingest] Sender reputation update failed for ${captureId}:`,
            err instanceof Error ? err.message : err,
          );
        }),
      );
    }
  }

  if (input.awaitAll) {
    await Promise.all(sideEffects);
  }
}
