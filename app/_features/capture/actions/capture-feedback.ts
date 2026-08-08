"use server";

/**
 * Explicit capture feedback (Capture Quality Repair, Phase C2).
 *
 * Wires the training-feedback API to the capture card: More/Less like this
 * adjusts the sender's reputation, and "Never capture this sender" adds a
 * blocklist entry (a capture rule enforced at the gate pipeline).
 */

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createClient } from "@/app/_lib/supabase/server";
import { recordFeedback, type FeedbackType } from "../services/training-feedback";
import { addBlocklistEntry } from "../services/blocklist-manager";

export interface CaptureFeedbackResult {
  success: boolean;
  error?: string;
}

async function loadCaptureSender(
  captureId: string,
  workspaceId: string
): Promise<{ senderEmail: string | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("capture_events")
    .select("extracted_data")
    .eq("id", captureId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) return null;
  const extracted = data.extracted_data as Record<string, unknown> | null;
  const senderEmail =
    typeof extracted?.sender_email === "string" ? extracted.sender_email : null;
  return { senderEmail };
}

/**
 * More like this / Less like this on a capture card.
 */
export async function submitCaptureFeedback(
  captureId: string,
  feedbackType: Extract<FeedbackType, "more_like_this" | "less_like_this">
): Promise<CaptureFeedbackResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const capture = await loadCaptureSender(captureId, workspace.id);
  if (!capture) {
    return { success: false, error: "Capture not found" };
  }

  try {
    await recordFeedback({
      workspaceId: workspace.id,
      captureEventId: captureId,
      feedbackType,
      senderEmail: capture.senderEmail ?? undefined,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record feedback",
    };
  }

  revalidatePath("/plays");
  revalidatePath("/sources");
  return { success: true };
}

/**
 * Never capture this sender: records the correction and adds the sender to
 * the workspace blocklist so future mail drops at the gate.
 */
export async function neverCaptureSender(
  captureId: string
): Promise<CaptureFeedbackResult> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const capture = await loadCaptureSender(captureId, workspace.id);
  if (!capture?.senderEmail) {
    return { success: false, error: "Capture has no sender email" };
  }

  try {
    await recordFeedback({
      workspaceId: workspace.id,
      captureEventId: captureId,
      feedbackType: "less_like_this",
      senderEmail: capture.senderEmail,
    });

    const blockResult = await addBlocklistEntry({
      workspaceId: workspace.id,
      type: "email",
      value: capture.senderEmail,
      reason: "Never capture (from capture card feedback)",
      createdBy: context.userId ?? undefined,
    });
    if (!blockResult.success) {
      return { success: false, error: blockResult.error };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to block sender",
    };
  }

  revalidatePath("/plays");
  revalidatePath("/sources");
  return { success: true };
}
