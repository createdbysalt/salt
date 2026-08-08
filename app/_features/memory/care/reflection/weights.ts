/**
 * Signal Source Weight Queries
 *
 * Reads learned confidence adjustments for the decision pipeline.
 * Weights are per-workspace, per-signal-source, per-field-type.
 *
 * Usage:
 * ```ts
 * const weight = await getSignalSourceWeight(
 *   workspaceId,
 *   "email_signature",
 *   "role"
 * );
 * const adjustedConfidence = baseConfidence * weight;
 * ```
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Tables } from "@/app/_lib/supabase/database.types";
import { REFLECTION_CONFIG, toSignalSourceWeight, type SignalSourceWeight } from "./types";

/**
 * The generated row types numeric columns as number, while the domain
 * mapper expects the raw string form Postgres decimals can arrive in.
 */
function mapWeightRow(row: Tables<"signal_source_weights">): SignalSourceWeight {
  return toSignalSourceWeight({ ...row, weight_adjustment: String(row.weight_adjustment) });
}

/**
 * Get the weight adjustment for a specific signal source + field type combo.
 * Returns 1.0 (no adjustment) if no learned weight exists.
 *
 * This is the primary query used by the decision pipeline.
 */
export async function getSignalSourceWeight(
  workspaceId: string,
  signalSource: string | undefined,
  fieldType: string
): Promise<number> {
  // If no signal source, return default weight
  if (!signalSource) {
    return REFLECTION_CONFIG.WEIGHT_CEILING;
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("signal_source_weights")
    .select("weight_adjustment")
    .eq("workspace_id", workspaceId)
    .eq("signal_source", signalSource)
    .eq("field_type", fieldType)
    .maybeSingle();

  if (error) {
    console.error("[weights] Query error:", error);
    return REFLECTION_CONFIG.WEIGHT_CEILING;
  }

  if (!data?.weight_adjustment) {
    return REFLECTION_CONFIG.WEIGHT_CEILING;
  }

  return parseFloat(String(data.weight_adjustment));
}

/**
 * Get all weight adjustments for a workspace.
 * Used for transparency UI in Memory → Rules.
 */
export async function getAllSignalSourceWeights(
  workspaceId: string
): Promise<SignalSourceWeight[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("signal_source_weights")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("last_updated_at", { ascending: false });

  if (error) {
    console.error("[weights] Query error:", error);
    return [];
  }

  return (data ?? []).map(mapWeightRow);
}

/**
 * Get weights for a specific signal source (all field types).
 */
export async function getWeightsForSource(
  workspaceId: string,
  signalSource: string
): Promise<SignalSourceWeight[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("signal_source_weights")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("signal_source", signalSource)
    .order("field_type");

  if (error) {
    console.error("[weights] Query error:", error);
    return [];
  }

  return (data ?? []).map(mapWeightRow);
}

/**
 * Get weights for a specific field type (all signal sources).
 */
export async function getWeightsForField(
  workspaceId: string,
  fieldType: string
): Promise<SignalSourceWeight[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("signal_source_weights")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("field_type", fieldType)
    .order("signal_source");

  if (error) {
    console.error("[weights] Query error:", error);
    return [];
  }

  return (data ?? []).map(mapWeightRow);
}

/**
 * Reset a specific weight (delete the adjustment).
 * Used when user explicitly resets learned behavior.
 */
export async function resetSignalSourceWeight(
  workspaceId: string,
  signalSource: string,
  fieldType: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("signal_source_weights")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("signal_source", signalSource)
    .eq("field_type", fieldType);

  if (error) {
    console.error("[weights] Delete error:", error);
    return false;
  }

  return true;
}

/**
 * Reset all weights for a workspace.
 * Used for "Reset all learning" action.
 */
export async function resetAllSignalSourceWeights(
  workspaceId: string
): Promise<{ deleted: number }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("signal_source_weights")
    .delete()
    .eq("workspace_id", workspaceId)
    .select("id");

  if (error) {
    console.error("[weights] Delete all error:", error);
    return { deleted: 0 };
  }

  return { deleted: data?.length ?? 0 };
}
