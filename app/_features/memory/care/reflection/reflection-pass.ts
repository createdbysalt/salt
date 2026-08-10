/**
 * Reflection Pass Capability
 *
 * P8 pattern-level learning: analyzes corrections to identify unreliable
 * signal sources and adjusts their weights for future confidence calculations.
 *
 * Runs when:
 * 1. A category crosses the correction threshold (5 corrections)
 * 2. Weekly batch cron (catches low-activity workspaces)
 *
 * Algorithm:
 * 1. Query correction_events since last reflection for the category
 * 2. Cluster corrections by signal_source + field_type
 * 3. Calculate weight adjustment for clusters with 3+ corrections
 * 4. Write to signal_source_weights table
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  buildCategory,
  calculateWeight,
  parseCategory,
  REFLECTION_CONFIG,
  type CorrectionCluster,
  type RunReflectionInput,
  type RunReflectionResult,
  type SignalSourceWeightRow,
} from "./types";
import { resetReflectionTrigger, getPendingReflectionTriggers } from "./triggers";

/**
 * Run a reflection pass for a specific category.
 * Called when trigger threshold is crossed or during weekly batch.
 */
export async function runReflectionPass(
  input: RunReflectionInput
): Promise<RunReflectionResult> {
  const { workspaceId, category } = input;
  const { signalSource, fieldType } = parseCategory(category);

  const admin = createAdminClient();

  // Get the trigger to find when we last reflected
  const { data: trigger } = await admin
    .from("reflection_triggers")
    .select("id, last_reflected_at")
    .eq("workspace_id", workspaceId)
    .eq("category", category)
    .single();

  // Query corrections since last reflection
  let query = admin
    .from("correction_events")
    .select("id, signal_source, field_path, created_at")
    .eq("workspace_id", workspaceId)
    .eq("signal_source", signalSource)
    .eq("field_path", fieldType)
    .order("created_at", { ascending: false });

  if (trigger?.last_reflected_at) {
    query = query.gt("created_at", trigger.last_reflected_at);
  }

  const { data: corrections, error: queryError } = await query;

  if (queryError) {
    console.error("[reflection-pass] Query error:", queryError);
    return {
      category,
      clustersAnalyzed: 0,
      weightsAdjusted: 0,
      newWeights: [],
    };
  }

  if (!corrections || corrections.length === 0) {
    // No new corrections — reset trigger and return
    if (trigger?.id) {
      await resetReflectionTrigger(trigger.id);
    }
    return {
      category,
      clustersAnalyzed: 0,
      weightsAdjusted: 0,
      newWeights: [],
    };
  }

  // Build cluster from corrections
  const cluster: CorrectionCluster = {
    signalSource,
    fieldType,
    correctionCount: corrections.length,
    correctionIds: corrections.map((c) => c.id),
    oldestCorrectionAt: new Date(corrections[corrections.length - 1].created_at),
    newestCorrectionAt: new Date(corrections[0].created_at),
  };

  // Apply weight adjustment if cluster is large enough
  const newWeights: RunReflectionResult["newWeights"] = [];

  if (cluster.correctionCount >= REFLECTION_CONFIG.MIN_CLUSTER_SIZE) {
    const result = await applyWeightAdjustment(
      workspaceId,
      signalSource,
      fieldType,
      cluster.correctionCount
    );

    if (result) {
      newWeights.push(result);
    }
  }

  // Reset the trigger
  if (trigger?.id) {
    await resetReflectionTrigger(trigger.id);
  }

  return {
    category,
    clustersAnalyzed: 1,
    weightsAdjusted: newWeights.length,
    newWeights,
  };
}

/**
 * Apply a weight adjustment for a signal source + field type combo.
 * Updates or creates the signal_source_weights row.
 *
 * Formula: weight = max(0.5, 1 - (total_corrections * 0.1))
 */
async function applyWeightAdjustment(
  workspaceId: string,
  signalSource: string,
  fieldType: string,
  newCorrectionCount: number
): Promise<{
  signalSource: string;
  fieldType: string;
  previousWeight: number;
  newWeight: number;
} | null> {
  const admin = createAdminClient();

  // Get existing weight (if any)
  const { data: existing } = await admin
    .from("signal_source_weights")
    .select("id, weight_adjustment, correction_count")
    .eq("workspace_id", workspaceId)
    .eq("signal_source", signalSource)
    .eq("field_type", fieldType)
    .maybeSingle();

  const previousWeight = existing?.weight_adjustment
    ? parseFloat(String(existing.weight_adjustment))
    : REFLECTION_CONFIG.WEIGHT_CEILING;

  const totalCorrections =
    (existing?.correction_count ?? 0) + newCorrectionCount;

  const newWeight = calculateWeight(totalCorrections);

  // Round to 2 decimal places
  const roundedWeight = Math.round(newWeight * 100) / 100;

  if (existing) {
    // Update existing weight
    const { error } = await admin
      .from("signal_source_weights")
      .update({
        weight_adjustment: roundedWeight,
        correction_count: totalCorrections,
        last_updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[reflection-pass] Update weight error:", error);
      return null;
    }
  } else {
    // Create new weight
    const { error } = await admin.from("signal_source_weights").insert({
      workspace_id: workspaceId,
      signal_source: signalSource,
      field_type: fieldType,
      weight_adjustment: roundedWeight,
      correction_count: totalCorrections,
    });

    if (error) {
      console.error("[reflection-pass] Insert weight error:", error);
      return null;
    }
  }

  console.log(
    `[reflection-pass] Adjusted weight for ${signalSource}:${fieldType}: ` +
      `${previousWeight} → ${roundedWeight} (${totalCorrections} corrections)`
  );

  return {
    signalSource,
    fieldType,
    previousWeight,
    newWeight: roundedWeight,
  };
}

/**
 * Run reflection passes for all pending triggers in a workspace.
 * Called by scheduler after processing corrections or by weekly cron.
 */
export async function runPendingReflections(
  workspaceId: string
): Promise<{
  triggersProcessed: number;
  totalWeightsAdjusted: number;
}> {
  const triggers = await getPendingReflectionTriggers(workspaceId);

  let totalWeightsAdjusted = 0;

  for (const trigger of triggers) {
    const result = await runReflectionPass({
      workspaceId,
      category: trigger.category,
    });
    totalWeightsAdjusted += result.weightsAdjusted;
  }

  return {
    triggersProcessed: triggers.length,
    totalWeightsAdjusted,
  };
}

/**
 * Run a full reflection scan for a workspace regardless of triggers.
 * Analyzes ALL corrections to rebuild weight adjustments.
 * Used by weekly cron or manual reset.
 */
export async function runFullReflectionScan(
  workspaceId: string
): Promise<{
  categoriesAnalyzed: number;
  weightsAdjusted: number;
}> {
  const admin = createAdminClient();

  // Get all distinct signal_source + field_path combos with corrections
  const { data: clusters, error } = await admin
    .from("correction_events")
    .select("signal_source, field_path")
    .eq("workspace_id", workspaceId)
    .not("signal_source", "is", null);

  if (error || !clusters) {
    console.error("[reflection-pass] Full scan query error:", error);
    return { categoriesAnalyzed: 0, weightsAdjusted: 0 };
  }

  // Group by unique category
  const categorySet = new Set<string>();
  for (const c of clusters) {
    if (c.signal_source && c.field_path) {
      categorySet.add(buildCategory(c.signal_source, c.field_path));
    }
  }

  let weightsAdjusted = 0;

  for (const category of categorySet) {
    const { signalSource, fieldType } = parseCategory(category);

    // Count total corrections for this category
    const { count } = await admin
      .from("correction_events")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("signal_source", signalSource)
      .eq("field_path", fieldType);

    const totalCorrections = count ?? 0;

    if (totalCorrections >= REFLECTION_CONFIG.MIN_CLUSTER_SIZE) {
      const result = await applyWeightAdjustment(
        workspaceId,
        signalSource,
        fieldType,
        totalCorrections
      );

      if (result) {
        weightsAdjusted++;
      }
    }
  }

  return {
    categoriesAnalyzed: categorySet.size,
    weightsAdjusted,
  };
}
