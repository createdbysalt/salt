"use server";

/**
 * Evidence Actions
 *
 * User-initiated mutations for pending evidence (dismiss / restore / mark
 * created). Callers guard tenancy before invoking.
 *
 * The system-lane write path (addSignalToEvidence) lives in ./add-signal.ts
 * — it runs from crons and backlog scripts with no request scope, so it
 * uses the admin client and must NOT be exported from a "use server" file
 * (request-boundary invariant INV-3).
 */

import { createClient } from "@/app/_lib/supabase/server";

/**
 * Dismiss pending evidence (stop watching).
 */
export async function dismissEvidence(
  evidenceId: string,
  reason?: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("pending_evidence")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
      dismissed_reason: reason || "User dismissed",
    })
    .eq("id", evidenceId);
}

/**
 * Mark evidence as created (record was added).
 */
export async function markEvidenceCreated(
  evidenceId: string,
  recordId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("pending_evidence")
    .update({
      status: "created",
      created_record_id: recordId,
      created_at: new Date().toISOString(),
    })
    .eq("id", evidenceId);
}

/**
 * Restore dismissed evidence back to watching.
 */
export async function restoreEvidence(evidenceId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("pending_evidence")
    .update({
      status: "watching",
      dismissed_at: null,
      dismissed_reason: null,
    })
    .eq("id", evidenceId);
}
