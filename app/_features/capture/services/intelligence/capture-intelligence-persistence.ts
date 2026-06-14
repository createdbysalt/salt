import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mergeIntelligenceMeta,
  type CaptureIntelligenceMeta,
} from "./capture-intelligence-outcome";

function captureIdFromFindingEvidence(evidence: unknown): string | null {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return null;
  }
  const sourceId = (evidence as { source_id?: unknown }).source_id;
  return typeof sourceId === "string" ? sourceId : null;
}

/**
 * After a finding is dismissed or repaired away, sync the linked capture ledger row.
 */
export async function persistCaptureOutcomeFromFindingEvidence(
  supabase: SupabaseClient,
  evidence: unknown,
  outcome: CaptureIntelligenceMeta["outcome"] = "no_signal"
): Promise<void> {
  const captureId = captureIdFromFindingEvidence(evidence);
  if (!captureId) return;
  await persistCaptureIntelligenceOutcome(supabase, captureId, outcome);
}

/**
 * Persist intelligence scan outcome on capture_events without changing routing state.
 */
export async function persistCaptureIntelligenceOutcome(
  supabase: SupabaseClient,
  captureId: string,
  outcome: CaptureIntelligenceMeta["outcome"],
  options: { findingId?: string; dryRun?: boolean } = {}
): Promise<void> {
  const { findingId, dryRun = false } = options;
  if (dryRun) return;

  const scannedAt = new Date().toISOString();
  const meta: CaptureIntelligenceMeta = {
    outcome,
    scanned_at: scannedAt,
    ...(findingId ? { finding_id: findingId } : {}),
  };

  const { data: row, error: fetchError } = await supabase
    .from("capture_events")
    .select("extracted_data")
    .eq("id", captureId)
    .single();

  if (fetchError) {
    console.error(
      `[capture-intelligence] Failed to load capture ${captureId}:`,
      fetchError.message
    );
    return;
  }

  const { error: updateError } = await supabase
    .from("capture_events")
    .update({
      extracted_data: mergeIntelligenceMeta(row?.extracted_data, meta),
      processed_at: scannedAt,
    })
    .eq("id", captureId);

  if (updateError) {
    console.error(
      `[capture-intelligence] Failed to persist outcome for ${captureId}:`,
      updateError.message
    );
  }
}
