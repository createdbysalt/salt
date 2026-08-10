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
import { recordDecisionOutcomeForCapture } from "@/app/_features/capture/services/intelligence/record-capture-outcome";

type AdmissionOutcome = "signal" | "noise" | "candidate";

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
