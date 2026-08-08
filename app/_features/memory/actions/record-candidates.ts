"use server";

/**
 * Actions for the Memory → Filter → Watching "New records" lane.
 *
 * Accept = immediate apply (Watching model W5): one tap creates the record
 * through the same autoCreateRecord path the auto tier uses, which also
 * marks the evidence created and feeds HQ "Created today".
 * Dismiss = stop watching that identifier (Watching model W6).
 */

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { getPendingEvidenceById } from "../evidence/queries";
import { dismissEvidence } from "../evidence/actions";
import { autoCreateRecord } from "../evidence/auto-create-record";

type ActionOutcome =
  | { success: true; recordId?: string }
  | { success: false; error: string };

async function guardCandidate(
  evidenceId: string,
  workspaceId: string
): Promise<
  | {
      ok: true;
      evidence: NonNullable<Awaited<ReturnType<typeof getPendingEvidenceById>>>;
      userId: string;
    }
  | { ok: false; error: string }
> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  if (workspace.id !== workspaceId) {
    return { ok: false, error: "Workspace mismatch" };
  }
  if (!context.userId) {
    return { ok: false, error: "Sign in required" };
  }

  const evidence = await getPendingEvidenceById(evidenceId);
  if (!evidence || evidence.workspace_id !== workspace.id) {
    return { ok: false, error: "Candidate not found" };
  }
  if (evidence.status !== "suggested") {
    return { ok: false, error: "This candidate was already resolved" };
  }

  return { ok: true, evidence, userId: context.userId };
}

/** One-tap "Add to Memory" — user override carries full confidence. */
export async function addRecordCandidate(
  evidenceId: string,
  workspaceId: string
): Promise<ActionOutcome> {
  const guard = await guardCandidate(evidenceId, workspaceId);
  if (!guard.ok) return { success: false, error: guard.error };

  const { evidence, userId } = guard;
  const result = await autoCreateRecord({
    workspaceId,
    evidenceId,
    entityType: evidence.entity_type,
    identifier: evidence.identifier,
    confidence: Math.round(evidence.confidencePercent),
    extractedFields: evidence.extracted_fields ?? {},
    signalCount: evidence.signals.length,
    // The confirming user is the acting user — files.uploaded_by requires it.
    actingUserId: userId,
    captureId:
      evidence.signals.find((signal) => signal.capture_id)?.capture_id ??
      undefined,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  revalidatePath("/memory");
  revalidatePath("/hq");
  return { success: true, recordId: result.recordId };
}

/** "Not this" — stop watching this identifier. */
export async function dismissRecordCandidate(
  evidenceId: string,
  workspaceId: string
): Promise<ActionOutcome> {
  const guard = await guardCandidate(evidenceId, workspaceId);
  if (!guard.ok) return { success: false, error: guard.error };

  await dismissEvidence(evidenceId, "Dismissed from Watching");

  revalidatePath("/memory");
  return { success: true };
}
