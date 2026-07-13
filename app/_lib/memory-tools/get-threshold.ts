/**
 * Workspace Threshold Retrieval
 *
 * Gets the confidence threshold for auto-applying changes.
 * Falls back to workspace default (85) if no playbook-specific override.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";
import { DEFAULT_THRESHOLD_SETTINGS } from "./types";

/** All entity types now use the unified memory-records playbook */
const UNIFIED_BLUEPRINT_SLUG = "memory-records";

const ENTITY_TO_BLUEPRINT: Record<LearningEntityType, string> = {
  person: UNIFIED_BLUEPRINT_SLUG,
  organization: UNIFIED_BLUEPRINT_SLUG,
  work: UNIFIED_BLUEPRINT_SLUG,
  billing: UNIFIED_BLUEPRINT_SLUG,
  meeting: UNIFIED_BLUEPRINT_SLUG,
  file: UNIFIED_BLUEPRINT_SLUG,
  me: UNIFIED_BLUEPRINT_SLUG,
};

interface ThresholdResult {
  threshold: number;
  source: "playbook" | "workspace" | "default";
  blueprintSlug?: string;
}

/**
 * Get the confidence threshold for a given entity type and optional field.
 *
 * Priority:
 * 1. Per-playbook setting (profile_playbook_settings.auto_apply_threshold)
 * 2. Workspace default (workspace_settings.default_confidence_threshold)
 * 3. Global default (85)
 */
export async function getWorkspaceThreshold(
  workspaceId: string,
  entityType: LearningEntityType,
  _field?: string
): Promise<ThresholdResult> {
  const admin = createAdminClient();
  const blueprintSlug = ENTITY_TO_BLUEPRINT[entityType];

  if (blueprintSlug) {
    const { data: settings } = await admin
      .from("profile_playbook_settings")
      .select("auto_apply_threshold")
      .eq("workspace_id", workspaceId)
      .eq("blueprint_slug", blueprintSlug)
      .maybeSingle();

    if (settings?.auto_apply_threshold != null) {
      return {
        threshold: Number(settings.auto_apply_threshold),
        source: "playbook",
        blueprintSlug,
      };
    }
  }

  // TODO: Check workspace_settings.default_confidence_threshold when that column exists
  // For now, fall back to global default
  return {
    threshold: DEFAULT_THRESHOLD_SETTINGS.defaultThreshold,
    source: "default",
  };
}

/**
 * Batch get thresholds for multiple entity types (optimization for bulk operations).
 */
export async function getWorkspaceThresholds(
  workspaceId: string,
  entityTypes: LearningEntityType[]
): Promise<Map<LearningEntityType, ThresholdResult>> {
  const admin = createAdminClient();
  const slugs = entityTypes.map((t) => ENTITY_TO_BLUEPRINT[t]).filter(Boolean);

  const { data: settings } = await admin
    .from("profile_playbook_settings")
    .select("blueprint_slug, auto_apply_threshold")
    .eq("workspace_id", workspaceId)
    .in("blueprint_slug", slugs);

  const settingsMap = new Map(
    (settings ?? []).map((s) => [s.blueprint_slug, s.auto_apply_threshold])
  );

  const results = new Map<LearningEntityType, ThresholdResult>();

  for (const entityType of entityTypes) {
    const slug = ENTITY_TO_BLUEPRINT[entityType];
    const override = slug ? settingsMap.get(slug) : undefined;

    if (override != null) {
      results.set(entityType, {
        threshold: Number(override),
        source: "playbook",
        blueprintSlug: slug,
      });
    } else {
      results.set(entityType, {
        threshold: DEFAULT_THRESHOLD_SETTINGS.defaultThreshold,
        source: "default",
      });
    }
  }

  return results;
}
