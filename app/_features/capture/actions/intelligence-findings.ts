"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import type { FindingState } from "../types/intelligence-findings";

function isNextRedirectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message === "NEXT_REDIRECT") return true;
  const digest = (error as Error & { digest?: string }).digest;
  return typeof digest === "string" && digest.includes("NEXT_REDIRECT");
}

const UpdateFindingStateSchema = z.object({
  findingId: z.string().uuid(),
  newState: z.enum(["acted", "dismissed"]),
  correctionReason: z.string().optional(),
});

/**
 * Update a finding's state (act or dismiss)
 *
 * When a user acts on or dismisses a finding:
 * 1. Update the finding state
 * 2. Record correction metadata for progressive autonomy
 * 3. Revalidate the queue
 */
export async function updateFindingState(
  input: z.infer<typeof UpdateFindingStateSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = UpdateFindingStateSchema.parse(input);
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace || !context.userId) {
      return { success: false, error: "Not signed in. Refresh the page and try again." };
    }

    const userId = context.userId;

    const workspaceId = workspace.id;
    const supabase = await createClient();

    const { error } = await supabase
      .from("intelligence_findings")
      .update({
        state: data.newState,
        corrected_at: new Date().toISOString(),
        corrected_by: userId,
        correction_reason: data.correctionReason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.findingId)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Failed to update finding state:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/plays");
    return { success: true };
  } catch (err) {
    if (isNextRedirectError(err)) {
      throw err;
    }
    console.error("updateFindingState error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Act on a finding — marks it as handled
 */
export async function actOnFinding(
  findingId: string
): Promise<{ success: boolean; error?: string }> {
  return updateFindingState({ findingId, newState: "acted" });
}

/**
 * Dismiss a finding — marks it as not relevant
 */
export async function dismissFinding(
  findingId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  return updateFindingState({
    findingId,
    newState: "dismissed",
    correctionReason: reason,
  });
}

/**
 * Batch dismiss multiple findings
 */
export async function dismissFindings(
  findingIds: string[]
): Promise<{ success: boolean; dismissed: number; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = getWorkspaceMemberOrNull(context);

  if (!workspace || !context.userId) {
    return { success: false, dismissed: 0, error: "Not signed in. Refresh the page and try again." };
  }

  const userId = context.userId;

  const workspaceId = workspace.id;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("intelligence_findings")
    .update({
      state: "dismissed" as FindingState,
      corrected_at: new Date().toISOString(),
      corrected_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .in("id", findingIds)
    .select("id");

  if (error) {
    console.error("Failed to batch dismiss findings:", error);
    return { success: false, dismissed: 0, error: error.message };
  }

  revalidatePath("/plays");
  return { success: true, dismissed: data?.length ?? 0 };
}
