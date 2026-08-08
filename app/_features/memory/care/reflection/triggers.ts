/**
 * Reflection Triggers
 *
 * Tracks correction counts per signal_source+field_type category.
 * When a category crosses the threshold (5 corrections), flags it for
 * a reflection pass that will compute weight adjustments.
 *
 * Called from the corrections flow after each correction is recorded.
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  buildCategory,
  REFLECTION_CONFIG,
  type IncrementTriggerInput,
  type IncrementTriggerResult,
  type ReflectionTriggerRow,
} from "./types";

/**
 * Increment the correction count for a signal_source+field_type category.
 * Returns whether the threshold was crossed (reflection should run).
 *
 * Uses upsert to handle first-time categories.
 */
export async function incrementReflectionTrigger(
  input: IncrementTriggerInput
): Promise<IncrementTriggerResult> {
  const { workspaceId, signalSource, fieldType } = input;

  // Skip if we don't have signal source info (legacy corrections)
  if (!signalSource || !fieldType) {
    return {
      category: "",
      newCount: 0,
      thresholdCrossed: false,
    };
  }

  const category = buildCategory(signalSource, fieldType);
  const admin = createAdminClient();

  // Try to increment existing trigger
  const { data: existing, error: selectError } = await admin
    .from("reflection_triggers")
    .select("id, correction_count")
    .eq("workspace_id", workspaceId)
    .eq("category", category)
    .maybeSingle();

  if (selectError) {
    console.error("[reflection-triggers] Select error:", selectError);
    return { category, newCount: 0, thresholdCrossed: false };
  }

  let newCount: number;

  if (existing) {
    // Increment existing trigger
    newCount = (existing.correction_count ?? 0) + 1;

    const { error: updateError } = await admin
      .from("reflection_triggers")
      .update({ correction_count: newCount })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[reflection-triggers] Update error:", updateError);
      return { category, newCount: existing.correction_count, thresholdCrossed: false };
    }
  } else {
    // Create new trigger
    newCount = 1;

    const { error: insertError } = await admin.from("reflection_triggers").insert({
      workspace_id: workspaceId,
      category,
      correction_count: newCount,
    });

    if (insertError) {
      console.error("[reflection-triggers] Insert error:", insertError);
      return { category, newCount: 0, thresholdCrossed: false };
    }
  }

  const thresholdCrossed = newCount >= REFLECTION_CONFIG.TRIGGER_THRESHOLD;

  return {
    category,
    newCount,
    thresholdCrossed,
  };
}

/**
 * Get all triggers that have crossed the threshold and need reflection.
 */
export async function getPendingReflectionTriggers(
  workspaceId: string
): Promise<ReflectionTriggerRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("reflection_triggers")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("correction_count", REFLECTION_CONFIG.TRIGGER_THRESHOLD);

  if (error) {
    console.error("[reflection-triggers] Query error:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Reset a trigger after reflection completes.
 * Sets correction_count back to 0 and updates last_reflected_at.
 */
export async function resetReflectionTrigger(
  triggerId: string
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("reflection_triggers")
    .update({
      correction_count: 0,
      last_reflected_at: new Date().toISOString(),
    })
    .eq("id", triggerId);

  if (error) {
    console.error("[reflection-triggers] Reset error:", error);
  }
}

/**
 * Get all triggers for a workspace (for admin/debug).
 */
export async function getAllReflectionTriggers(
  workspaceId: string
): Promise<ReflectionTriggerRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("reflection_triggers")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("correction_count", { ascending: false });

  if (error) {
    console.error("[reflection-triggers] Query error:", error);
    return [];
  }

  return data ?? [];
}
