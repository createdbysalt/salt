import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { processCaptureForEvidence } from "@/app/_features/memory/evidence";

/**
 * Capture evidence backfill (Memory Sourcing Overhaul, Phase 3).
 *
 * Nightly lane for captures where evidence never ran:
 *  - the historical bootstrap-email backlog (pre policy fix, bootstrap email
 *    skipped evidence entirely and depended on an email-only LLM scan), and
 *  - rows stamped `pending_backfill` at ingest (bootstrap / bulk-import
 *    non-email the email-only scan can never reach).
 *
 * Selection rides the `extracted_data.evidence.processed_at` stamp that
 * processCaptureForEvidence writes — a row without it has never accumulated
 * evidence, so reprocessing can never double-count signal weights.
 *
 * Bodies come from the conversation_messages store (capped, TTL'd) instead
 * of the snippet the capture row carries. Deterministic classifiers only —
 * no LLM spend here — but volume is still capped per workspace and per run
 * so a huge backlog drains over nights instead of one long invocation.
 *
 * Also purges expired message bodies (purge_expired_conversation_bodies) —
 * bodies are extraction fuel, not an archive.
 */

/** Per-workspace nightly cap — backlog drains over multiple runs. */
export const EVIDENCE_BACKFILL_PER_WORKSPACE_CAP = 100;
/** Global per-run cap so the cron stays inside maxDuration. */
export const EVIDENCE_BACKFILL_GLOBAL_CAP = 500;
/** Page size for candidate selection. */
const CANDIDATE_PAGE_SIZE = 100;

export interface EvidenceBackfillResult {
  capturesProcessed: number;
  signalsDetected: number;
  bodiesPurged: number;
  workspacesSeen: number;
  failures: { captureId: string; error: string }[];
  durationMs: number;
}

interface CandidateRow {
  id: string;
  workspace_id: string;
  extracted_data: Record<string, unknown> | null;
}

/**
 * Best-effort stamp so a row leaves the backfill candidate set. Used for
 * historical rows that already have evidence provenance (evidence ran
 * pre-stamp) — without the stamp they would wall the first page forever.
 */
async function stampBackfillSkip(
  admin: ReturnType<typeof createAdminClient>,
  candidate: CandidateRow,
): Promise<void> {
  try {
    await admin
      .from("capture_events")
      .update({
        extracted_data: {
          ...(candidate.extracted_data ?? {}),
          evidence: {
            processed_at: new Date().toISOString(),
            signals_detected: null,
            backfill_skipped: "already_processed",
          },
        } as never,
      })
      .eq("id", candidate.id);
  } catch (stampError) {
    console.warn(
      `[evidence-backfill] skip-stamp failed for ${candidate.id}:`,
      stampError instanceof Error ? stampError.message : stampError,
    );
  }
}

export async function runCaptureEvidenceBackfill(): Promise<EvidenceBackfillResult> {
  const start = Date.now();
  const admin = createAdminClient();

  // 1. Body TTL purge (extraction fuel, not an archive).
  let bodiesPurged = 0;
  try {
    const { data, error } = await admin.rpc("purge_expired_conversation_bodies");
    if (error) {
      console.warn("[evidence-backfill] body purge failed:", error.message);
    } else {
      bodiesPurged = typeof data === "number" ? data : 0;
    }
  } catch (purgeError) {
    console.warn(
      "[evidence-backfill] body purge threw:",
      purgeError instanceof Error ? purgeError.message : purgeError,
    );
  }

  // 2. Candidates: evidence never ran (no stamp) AND (bootstrap backlog OR
  //    pending_backfill stamp). Held/noise rows are excluded — kept-out mail
  //    stays thin. Oldest first so the backlog drains FIFO.
  const failures: { captureId: string; error: string }[] = [];
  let capturesProcessed = 0;
  let signalsDetected = 0;
  const perWorkspace = new Map<string, number>();
  // Rows we processed or deliberately skipped. Processed rows leave the
  // candidate set via the evidence stamp, but the stamp is best-effort and
  // capped-workspace rows stay — the seen set keeps both from looping.
  const seenIds = new Set<string>();

  while (capturesProcessed < EVIDENCE_BACKFILL_GLOBAL_CAP) {
    // Always read the FIRST page: processed rows leave the result set as
    // their evidence stamp lands, so offset pagination would skip candidates.
    const { data: candidates, error } = await admin
      .from("capture_events")
      .select("id, workspace_id, extracted_data")
      .is("extracted_data->evidence", null)
      .or(
        "is_bootstrap.eq.true,extracted_data->intelligence->>outcome.eq.pending_backfill",
      )
      .not("gate_action", "in", '("held","noise")')
      .order("created_at", { ascending: true })
      .limit(CANDIDATE_PAGE_SIZE);

    if (error) {
      console.error("[evidence-backfill] candidate query failed:", error.message);
      failures.push({ captureId: "(query)", error: error.message });
      break;
    }
    if (!candidates || candidates.length === 0) break;

    // Historical guard: the evidence.processed_at stamp only exists on rows
    // processed after the stamp shipped. Pre-stamp bootstrap rows that DID
    // run evidence at ingest (account-scoped captures always did) would
    // otherwise be reprocessed and double-count signal weights. Provenance
    // rows are the durable record that evidence ran.
    const pageIds = (candidates as CandidateRow[]).map((c) => c.id);
    const { data: provenanceRows, error: provenanceError } = await admin
      .from("pending_evidence_signals")
      .select("capture_id")
      .in("capture_id", pageIds);
    if (provenanceError) {
      // Fail closed: without provenance we cannot tell pre-stamp rows that
      // already ran evidence from true backlog — reprocessing would
      // double-count signal weights. Retry next run.
      console.error(
        "[evidence-backfill] provenance check failed:",
        provenanceError.message,
      );
      failures.push({ captureId: "(provenance)", error: provenanceError.message });
      break;
    }
    const hasEvidence = new Set(
      (provenanceRows ?? []).map((r) => r.capture_id as string),
    );

    let progressed = false;
    for (const candidate of candidates as CandidateRow[]) {
      if (capturesProcessed >= EVIDENCE_BACKFILL_GLOBAL_CAP) break;
      if (seenIds.has(candidate.id)) continue;
      seenIds.add(candidate.id);
      if (hasEvidence.has(candidate.id)) {
        // Evidence already ran (pre-stamp history): stamp so the row leaves
        // the candidate set, and count it as progress so paging continues.
        progressed = true;
        await stampBackfillSkip(admin, candidate);
        continue;
      }

      const seen = perWorkspace.get(candidate.workspace_id) ?? 0;
      if (seen >= EVIDENCE_BACKFILL_PER_WORKSPACE_CAP) continue;

      progressed = true;
      try {
        // Message-store body beats the snippet when one was persisted.
        const { data: message } = await admin
          .from("conversation_messages")
          .select("body_text")
          .eq("capture_event_id", candidate.id)
          .not("body_text", "is", null)
          .order("occurred_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const result = await processCaptureForEvidence(candidate.id, {
          bodyOverride: message?.body_text ?? null,
        });
        if (result.processed) {
          capturesProcessed += 1;
          signalsDetected += result.signalsDetected;
          perWorkspace.set(candidate.workspace_id, seen + 1);
        }
      } catch (processError) {
        failures.push({
          captureId: candidate.id,
          error:
            processError instanceof Error
              ? processError.message
              : String(processError),
        });
      }
    }

    // A full page of already-seen rows means only capped-workspace candidates
    // remain — nothing more to do this run.
    if (!progressed) break;
  }

  return {
    capturesProcessed,
    signalsDetected,
    bodiesPurged,
    workspacesSeen: perWorkspace.size,
    failures,
    durationMs: Date.now() - start,
  };
}
