import "server-only";

import type { createAdminClient } from "@/app/_lib/supabase/admin";
import type { CaptureEnvelope } from "../../../adapters/types";
import type { CaptureOrigin } from "../../../types";
import type { GatePipelineResult } from "../../../types/gate-result";
import { mergeIntelligenceMeta } from "../../intelligence/capture-intelligence-outcome";
import type { PostIngestLanes } from "../policy";
import type { IngestEnvelopeOptions } from "../types";

type AdminClient = ReturnType<typeof createAdminClient>;

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

function thinHeldExtracted(
  extracted: Record<string, unknown>,
): Record<string, unknown> {
  const thin: Record<string, unknown> = {};
  for (const key of HELD_EXTRACTED_KEYS) {
    if (extracted[key] !== undefined) thin[key] = extracted[key];
  }
  return thin;
}

export type PersistCaptureResult =
  | { kind: "inserted"; captureId: string; dbForcedNoise: boolean }
  | { kind: "duplicate" }
  | { kind: "error"; error: string };

/**
 * Persist stage: build the capture_events row (held thinning, terminal
 * intelligence stamp, gate audit JSON) and insert it. Dedupe rides the DB
 * unique constraint on (workspace_id, source_type, source_external_id).
 *
 * The capture_budget_enforcer DB trigger re-checks the budget atomically at
 * insert and is authoritative over the orchestrator's racy peek — the
 * returned gate_action is truth, surfaced here as `dbForcedNoise` so no
 * stamped row is ever enriched.
 */
export async function persistCaptureStage(
  admin: AdminClient,
  workspaceId: string,
  integrationId: string | null,
  envelope: CaptureEnvelope,
  options: IngestEnvelopeOptions,
  gateResult: GatePipelineResult | undefined,
  lanes: PostIngestLanes,
): Promise<PersistCaptureResult> {
  const extractedData = lanes.isHeld
    ? thinHeldExtracted(envelope.extracted as Record<string, unknown>)
    : lanes.terminalStamp
      ? mergeIntelligenceMeta(envelope.extracted, {
          outcome: lanes.terminalStamp,
          scanned_at: new Date().toISOString(),
        })
      : envelope.extracted;

  const gateResultForRow = gateResult
    ? ({
        ...gateResult,
        ...(lanes.forcedNoiseByBudget ? { budgetExceeded: true } : {}),
      } as unknown as Record<string, unknown>)
    : lanes.forcedNoiseByBudget
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
      state: lanes.captureState,
      overall_confidence: lanes.overallConfidence,
      is_bootstrap: options.isBootstrap ?? false,
      gate_action: lanes.forcedNoiseByBudget
        ? "noise"
        : (gateResult?.finalAction ?? null),
      gate_result: gateResultForRow,
    } as never)
    .select("id, gate_action")
    .single();

  if (error?.code === "23505") {
    return { kind: "duplicate" };
  }
  if (error || !data) {
    console.error(
      `[ingest/persist] insert failed for ${envelope.sourceType}/${envelope.externalId}:`,
      error?.message,
    );
    return { kind: "error", error: `${error?.code}: ${error?.message}` };
  }

  const row = data as { id: string; gate_action: string | null };
  const dbForcedNoise = !lanes.isNoise && row.gate_action === "noise";
  return { kind: "inserted", captureId: row.id, dbForcedNoise };
}
