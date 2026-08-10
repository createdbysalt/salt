"use server";

/**
 * Admission decision actions for Memory → Filter.
 *
 * Capture candidates live in Watching. User nudges teach the bar:
 * - Let it in → gate_action = signal (Salt starts learning from it)
 * - Keep it out → gate_action = noise (moves to Kept out)
 * - Actually, let this in (from Kept out) → gate_action = candidate
 *   (back to Watching — not a straight admission)
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { getCategoryForConnector } from "@/app/_lib/composio/enrichment/registry";
import { recordDecisionOutcomeForCapture } from "@/app/_features/capture/services/intelligence/record-capture-outcome";
import { extractFeedbackEntityForEnvelope } from "@/app/_features/capture/adapters/feedback-entity";
import { recordEntityObservation } from "@/app/_features/capture/services/entity-profiles";
import type { CaptureEnvelope } from "@/app/_features/capture/adapters/types";
import type {
  CaptureEventType,
  CaptureSourceType,
} from "@/app/_features/capture/types";

type AdmissionOutcome = "signal" | "noise" | "candidate";

interface CaptureEntityRow {
  source_type: string;
  capture_type: string;
  title: string | null;
  source_external_id: string | null;
  extracted_data: unknown;
  raw_payload: unknown;
}

/**
 * P6 implicit writer: admission outcomes teach entity reputation across ALL
 * categories (let-in +5, keep-out −5; back-to-Watching is not a verdict).
 * Keys come from the P2 adapter extraction. Never throws — learning must
 * not fail the user's action.
 */
async function recordAdmissionObservation(
  workspaceId: string,
  captureId: string,
  gateAction: AdmissionOutcome,
): Promise<void> {
  if (gateAction === "candidate") return;

  try {
    const supabase = await createClient();
    const { data: capture } = await supabase
      .from("capture_events")
      .select(
        "source_type, capture_type, title, source_external_id, extracted_data, raw_payload",
      )
      .eq("id", captureId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!capture) return;

    const row = capture as CaptureEntityRow;
    const envelope: CaptureEnvelope = {
      sourceType: row.source_type as CaptureSourceType,
      captureType: row.capture_type as CaptureEventType,
      externalId: row.source_external_id ?? captureId,
      title: row.title,
      occurredAt: null,
      participants: [],
      threadId: null,
      extracted:
        row.extracted_data && typeof row.extracted_data === "object"
          ? (row.extracted_data as Record<string, unknown>)
          : {},
      raw:
        row.raw_payload && typeof row.raw_payload === "object"
          ? (row.raw_payload as Record<string, unknown>)
          : {},
      noise: null,
    };

    const entity = await extractFeedbackEntityForEnvelope(envelope);
    if (!entity) return;

    const category = await getCategoryForConnector(row.source_type);
    if (!category) return;

    await recordEntityObservation(workspaceId, {
      provider: row.source_type,
      category,
      entity,
      delta: gateAction === "signal" ? 5 : -5,
    });
  } catch (error) {
    console.error("[admission-decisions] entity observation failed:", error);
  }
}

async function setCaptureGateAction(
  captureId: string,
  workspaceId: string,
  gateAction: AdmissionOutcome
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  if (workspace.id !== workspaceId) {
    return { success: false, error: "Workspace mismatch" };
  }

  if (!context.userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();
  // Table is capture_events — "captures" does not exist; the untyped server
  // client let this compile while Let-in/Keep-out silently failed at runtime.
  const { error } = await supabase
    .from("capture_events")
    .update({ gate_action: gateAction })
    .eq("id", captureId)
    .eq("workspace_id", workspace.id);

  if (error) {
    console.error("[admission-decisions] Failed to update gate_action:", error);
    return { success: false, error: error.message };
  }

  // Calibration repair (Connector Rules & Learning, P4): accept/dismiss
  // verdicts must reach record_capture_decisions or the auto-apply earn
  // loop can never trigger from real feedback. "candidate" (back to
  // Watching) is not a verdict — no outcome.
  if (gateAction === "signal" || gateAction === "noise") {
    await recordDecisionOutcomeForCapture(
      captureId,
      gateAction === "signal" ? "approved" : "rejected",
      context.userId,
    );
    await recordAdmissionObservation(workspace.id, captureId, gateAction);
  }

  revalidatePath("/memory");
  revalidatePath("/sources");
  return { success: true };
}

/** Admit a Watching candidate so Salt starts learning from it. */
export async function letCaptureIn(
  captureId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  return setCaptureGateAction(captureId, workspaceId, "signal");
}

/** Keep a Watching candidate out of Memory (moves to Kept out). */
export async function keepCaptureOut(
  captureId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  return setCaptureGateAction(captureId, workspaceId, "noise");
}

/**
 * Move a Kept-out item back to Watching. Plan rule: does not admit
 * straight in — Salt watches until the bar clears.
 */
export async function moveKeptOutToWatching(
  captureId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  return setCaptureGateAction(captureId, workspaceId, "candidate");
}
