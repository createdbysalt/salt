/**
 * Workspace Threshold Retrieval
 *
 * Reads the Memory Care auto-apply threshold from
 * `workspaces.memory_care_auto_apply_threshold` (default 85).
 *
 * This is the single source of truth shared by `memoryUpdateField` and the
 * care decision pipeline (`getCareThreshold`). Per-playbook overrides are
 * retired — care capabilities no longer live in the playbook engine.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";
import { DEFAULT_THRESHOLD_SETTINGS } from "./types";

const DEFAULT_THRESHOLD = DEFAULT_THRESHOLD_SETTINGS.defaultThreshold;

interface ThresholdResult {
  threshold: number;
  source: "care" | "default";
}

/**
 * Get the confidence threshold for a given workspace.
 *
 * Priority:
 * 1. Workspace Memory Care threshold (`memory_care_auto_apply_threshold`)
 * 2. Global default (85)
 *
 * `entityType` / `field` are accepted for call-site compatibility; tiered
 * bars (sensitive / destructive / never-touch) are applied by callers via
 * `minThreshold` and `field-tiers.ts`, not here.
 */
export async function getWorkspaceThreshold(
  workspaceId: string,
  _entityType?: LearningEntityType,
  _field?: string
): Promise<ThresholdResult> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspaces")
    .select("memory_care_auto_apply_threshold")
    .eq("id", workspaceId)
    .maybeSingle();

  if (data?.memory_care_auto_apply_threshold != null) {
    return {
      threshold: Number(data.memory_care_auto_apply_threshold),
      source: "care",
    };
  }

  return {
    threshold: DEFAULT_THRESHOLD,
    source: "default",
  };
}

/**
 * Batch get thresholds for multiple entity types.
 * All entity types share the same workspace care threshold.
 */
export async function getWorkspaceThresholds(
  workspaceId: string,
  entityTypes: LearningEntityType[]
): Promise<Map<LearningEntityType, ThresholdResult>> {
  const shared = await getWorkspaceThreshold(workspaceId);
  const results = new Map<LearningEntityType, ThresholdResult>();
  for (const entityType of entityTypes) {
    results.set(entityType, shared);
  }
  return results;
}
