import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { classifyCaptureNoise } from "./intelligence/capture-noise";
import type { CaptureEnvelope } from "../adapters/types";
import type { CaptureOrigin, CaptureState } from "../types";

/**
 * Generic capture ingestor (connector-platform Phase 3.3).
 *
 * One write path for every capture source: adapter-normalized envelope →
 * noise gate → capture_events insert (dedupe on the DB unique constraint).
 * The existing pipeline consumes rows exactly as before — routing engine,
 * classifiers, and play triggers are untouched by how items arrive.
 */

export type IngestOutcome = "created" | "duplicate" | "noise" | "error";

export interface IngestEnvelopeOptions {
  isBootstrap?: boolean;
  /** Origin for the row; trigger/webhook arrivals are "found". */
  origin?: CaptureOrigin;
}

export async function ingestEnvelope(
  workspaceId: string,
  integrationId: string | null,
  envelope: CaptureEnvelope,
  options: IngestEnvelopeOptions = {},
): Promise<{ outcome: IngestOutcome; noiseReason?: string; error?: string }> {
  if (envelope.noise) {
    const verdict = classifyCaptureNoise(envelope.noise);
    if (verdict.isNoise) {
      return { outcome: "noise", noiseReason: verdict.reason };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("capture_events").insert({
    workspace_id: workspaceId,
    source_type: envelope.sourceType,
    source_connection_id: integrationId,
    source_external_id: envelope.externalId,
    capture_type: envelope.captureType,
    origin: options.origin ?? ("found" as CaptureOrigin),
    title: envelope.title,
    raw_payload: envelope.raw as never,
    extracted_data: envelope.extracted as never,
    state: "pending" as CaptureState,
    overall_confidence: null,
    is_bootstrap: options.isBootstrap ?? false,
  });

  if (!error) {
    return { outcome: "created" };
  }
  if (error.code === "23505") {
    return { outcome: "duplicate" };
  }
  console.error(
    `[ingest-envelope] insert failed for ${envelope.sourceType}/${envelope.externalId}:`,
    error.message,
  );
  return { outcome: "error", error: `${error.code}: ${error.message}` };
}
