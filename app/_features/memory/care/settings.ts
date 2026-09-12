/**
 * Memory Care settings — the single owner of the workspace auto-apply
 * threshold and per-capability enablement.
 *
 * Storage:
 * - Threshold: `workspaces.memory_care_auto_apply_threshold` (renamed from
 *   the retired `keeper_auto_execute_threshold`).
 * - Capability enablement: `profile_playbook_settings` rows keyed by
 *   `workspace_id` + `blueprint_slug`, using the care settings slugs
 *   (`memory-records`, `memory-hygiene`, `memory-connections`,
 *   `memory-notes`). Legacy `keeper-*` slugs are read as fallbacks so
 *   existing workspaces keep their preferences.
 *
 * No playbook engine involvement: these accessors are read by the care
 * scheduler, the decision pipeline, and the Memory → Rules UI.
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  CARE_CAPABILITIES,
  CARE_LEGACY_SLUGS,
  CARE_SETTINGS_SLUGS,
  DEFAULT_CARE_THRESHOLD,
  type CareCapability,
} from "./types";

/**
 * Workspace-level auto-apply threshold (50–100, default 85). One
 * user-controlled bar for every gated field — tiers never raise it;
 * `never_touch` fields are refused outright (see `tierBar` in
 * `app/_lib/learning/field-tiers.ts`).
 */
export async function getCareThreshold(workspaceId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspaces")
    .select("memory_care_auto_apply_threshold")
    .eq("id", workspaceId)
    .maybeSingle();

  return data?.memory_care_auto_apply_threshold ?? DEFAULT_CARE_THRESHOLD;
}

function allSlugsFor(capability: CareCapability): string[] {
  return [CARE_SETTINGS_SLUGS[capability], ...CARE_LEGACY_SLUGS[capability]];
}

/**
 * Enabled state for every capability. Missing rows mean enabled — care
 * capabilities are on by default and users opt out from Memory → Rules.
 * Legacy `keeper-*` rows are honored when no current-slug row exists.
 */
export async function getCareCapabilityStates(
  workspaceId: string
): Promise<Record<CareCapability, boolean>> {
  const admin = createAdminClient();
  const slugs = CARE_CAPABILITIES.flatMap((c) => allSlugsFor(c));

  const { data } = await admin
    .from("profile_playbook_settings")
    .select("blueprint_slug, enabled")
    .eq("workspace_id", workspaceId)
    .in("blueprint_slug", slugs);

  const bySlug = new Map(
    (data ?? []).map((row) => [row.blueprint_slug, row.enabled])
  );

  const states = {} as Record<CareCapability, boolean>;
  for (const capability of CARE_CAPABILITIES) {
    const current = bySlug.get(CARE_SETTINGS_SLUGS[capability]);
    if (current != null) {
      states[capability] = current;
      continue;
    }
    const legacy = CARE_LEGACY_SLUGS[capability]
      .map((slug) => bySlug.get(slug))
      .find((value) => value != null);
    states[capability] = legacy ?? true;
  }
  return states;
}

export async function isCareCapabilityEnabled(
  workspaceId: string,
  capability: CareCapability
): Promise<boolean> {
  const states = await getCareCapabilityStates(workspaceId);
  return states[capability];
}
