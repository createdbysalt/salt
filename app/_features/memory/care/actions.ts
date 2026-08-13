"use server";

/**
 * Memory Care settings actions — used by the Memory → Customize surface
 * (threshold slider + learned-source weights).
 *
 * Data accessors live in `./settings.ts`; this file holds the user-scoped
 * server actions. Capability toggles (`setCareCapabilityEnabled`) were
 * removed with the Rules UI — capabilities are no longer user-switchable.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getCareCapabilityStates, getCareThreshold } from "./settings";
import {
  getAllSignalSourceWeights,
  resetSignalSourceWeight,
  resetAllSignalSourceWeights,
  type SignalSourceWeight,
} from "./reflection";
import {
  CARE_CAPABILITIES,
  CARE_SETTINGS_SLUGS,
  type CareCapability,
} from "./types";

export interface MemoryCareSettings {
  threshold: number;
  capabilities: Array<{
    capability: CareCapability;
    slug: string;
    enabled: boolean;
  }>;
}

export async function getMemoryCareSettings(
  workspaceId: string
): Promise<MemoryCareSettings> {
  const [threshold, states] = await Promise.all([
    getCareThreshold(workspaceId),
    getCareCapabilityStates(workspaceId),
  ]);

  return {
    threshold,
    capabilities: CARE_CAPABILITIES.map((capability) => ({
      capability,
      slug: CARE_SETTINGS_SLUGS[capability],
      enabled: states[capability],
    })),
  };
}

/**
 * Update the workspace auto-apply threshold (standard-tier bar).
 * Value must be between 50 and 100.
 */
export async function updateMemoryCareThreshold(
  workspaceId: string,
  threshold: number
): Promise<void> {
  if (threshold < 50 || threshold > 100) {
    throw new Error("Threshold must be between 50 and 100");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("workspaces")
    .update({ memory_care_auto_apply_threshold: threshold })
    .eq("id", workspaceId);

  if (error) throw error;

  revalidatePath("/memory");
  revalidatePath("/settings/plays");
}

// =============================================================================
// P8 Learned Weights (Reflection Pass)
// =============================================================================

/**
 * Get all learned signal source weights for the workspace.
 * Used by Memory → Customize to show "What Salt has learned" section.
 */
export async function getLearnedWeights(
  workspaceId: string
): Promise<SignalSourceWeight[]> {
  return getAllSignalSourceWeights(workspaceId);
}

/**
 * Reset a single learned weight (delete the adjustment).
 * Salt will treat this source+field as fully reliable again.
 */
export async function resetLearnedWeight(
  workspaceId: string,
  signalSource: string,
  fieldType: string
): Promise<{ success: boolean }> {
  const result = await resetSignalSourceWeight(workspaceId, signalSource, fieldType);
  if (result) {
    revalidatePath("/memory");
  }
  return { success: result };
}

/**
 * Reset all learned weights for the workspace.
 * Salt forgets everything it learned about signal reliability.
 */
export async function resetAllLearnedWeights(
  workspaceId: string
): Promise<{ deleted: number }> {
  const result = await resetAllSignalSourceWeights(workspaceId);
  if (result.deleted > 0) {
    revalidatePath("/memory");
  }
  return result;
}
