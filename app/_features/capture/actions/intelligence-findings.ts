"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { applyMemoryPlanForFinding } from "../services/intelligence/apply-memory-plan";
import { persistCaptureOutcomeFromFindingEvidence } from "../services/intelligence/capture-intelligence-persistence";
import {
  learnVendorFromDismiss,
} from "../services/intelligence/sender-profile-learn";
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

    if (data.newState === "dismissed") {
      const { data: findingRow } = await supabase
        .from("intelligence_findings")
        .select("finding_type, evidence")
        .eq("id", data.findingId)
        .eq("workspace_id", workspaceId)
        .single();

      if (findingRow) {
        const metadata =
          findingRow.evidence &&
          typeof findingRow.evidence === "object" &&
          !Array.isArray(findingRow.evidence)
            ? (findingRow.evidence as { metadata?: { vendor_name?: string } })
                .metadata
            : undefined;

        await learnVendorFromDismiss({
          supabase,
          workspaceId,
          userId,
          findingType: findingRow.finding_type,
          evidence: findingRow.evidence,
          vendorName:
            typeof metadata?.vendor_name === "string"
              ? metadata.vendor_name
              : undefined,
        });

        await persistCaptureOutcomeFromFindingEvidence(
          supabase,
          findingRow.evidence,
          "no_signal"
        );
      }
    }

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

const ApplyMemoryPlanSchema = z.object({
  findingId: z.string().uuid(),
  selectedProposalIndexes: z.array(z.number().int().min(0)).optional(),
});

/**
 * Apply memory proposals from a finding — creates or links orgs, people, work, meetings.
 */
export async function applyMemoryPlan(
  findingId: string,
  selectedProposalIndexes?: number[]
): Promise<{
  success: boolean;
  error?: string;
  created?: Record<string, string[]>;
}> {
  try {
    const data = ApplyMemoryPlanSchema.parse({
      findingId,
      selectedProposalIndexes,
    });
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace || !context.userId) {
      return { success: false, error: "Not signed in. Refresh the page and try again." };
    }

    const result = await applyMemoryPlanForFinding({
      workspaceId: workspace.id,
      userId: context.userId,
      findingId: data.findingId,
      selectedProposalIndexes: data.selectedProposalIndexes,
    });

    if (result.success) {
      revalidatePath("/plays");
    }

    return result;
  } catch (err) {
    if (isNextRedirectError(err)) {
      throw err;
    }
    console.error("applyMemoryPlan error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
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

const ToggleFlagFindingSchema = z.object({
  findingId: z.string().uuid(),
});

/**
 * Flag or unflag a finding for follow-up (star in Plays queue).
 */
export async function toggleFlagFinding(
  findingId: string
): Promise<{ success: boolean; flagged: boolean; error?: string }> {
  try {
    const data = ToggleFlagFindingSchema.parse({ findingId });
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace || !context.userId) {
      return {
        success: false,
        flagged: false,
        error: "Not signed in. Refresh the page and try again.",
      };
    }

    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("intelligence_findings")
      .select("flagged_at")
      .eq("id", data.findingId)
      .eq("workspace_id", workspace.id)
      .single();

    if (fetchError || !existing) {
      return {
        success: false,
        flagged: false,
        error: fetchError?.message ?? "Finding not found",
      };
    }

    const isFlagged = Boolean(existing.flagged_at);
    const { error: updateError } = await supabase
      .from("intelligence_findings")
      .update({
        flagged_at: isFlagged ? null : new Date().toISOString(),
        flagged_by: isFlagged ? null : context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.findingId)
      .eq("workspace_id", workspace.id);

    if (updateError) {
      console.error("Failed to toggle finding flag:", updateError);
      return { success: false, flagged: isFlagged, error: updateError.message };
    }

    revalidatePath("/plays");
    return { success: true, flagged: !isFlagged };
  } catch (err) {
    if (isNextRedirectError(err)) {
      throw err;
    }
    console.error("toggleFlagFinding error:", err);
    return {
      success: false,
      flagged: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
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

  const { data: findingsBeforeDismiss } = await supabase
    .from("intelligence_findings")
    .select("id, finding_type, evidence")
    .eq("workspace_id", workspaceId)
    .in("id", findingIds);

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

  for (const row of findingsBeforeDismiss ?? []) {
    const metadata =
      row.evidence &&
      typeof row.evidence === "object" &&
      !Array.isArray(row.evidence)
        ? (row.evidence as { metadata?: { vendor_name?: string } }).metadata
        : undefined;

    await learnVendorFromDismiss({
      supabase,
      workspaceId,
      userId,
      findingType: row.finding_type,
      evidence: row.evidence,
      vendorName:
        typeof metadata?.vendor_name === "string" ? metadata.vendor_name : undefined,
    });

    await persistCaptureOutcomeFromFindingEvidence(
      supabase,
      row.evidence,
      "no_signal"
    );
  }

  revalidatePath("/plays");
  return { success: true, dismissed: data?.length ?? 0 };
}
