import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { PEOPLE_PROFILE_SLUG } from "./apply-person-profile";
import type {
  ProfileContextFacts,
  ProfileFieldKey,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "./types";
import {
  defaultOrgProfileRules,
  defaultPeopleProfileRules,
  defaultWorkProfileRules,
} from "./validate-rules";

function defaultRulesForSlug(slug: string): ProfileFillRulesDocument {
  if (slug === "organizations-profile") return defaultOrgProfileRules();
  if (slug === "work-profile") return defaultWorkProfileRules();
  return defaultPeopleProfileRules();
}

function mapSettingsRow(row: Record<string, unknown>, blueprintSlug: string): ProfilePlaybookSettings {
  return {
    autoApplyThreshold: Number(row.auto_apply_threshold ?? 85),
    aiFallbackEnabled: Boolean(row.ai_fallback_enabled ?? true),
    contextFacts: (row.context_facts as ProfileContextFacts) ?? {},
    fillRulesOverride: (row.fill_rules_override as ProfileFillRulesDocument | null) ?? null,
    activeSections:
      (row.active_sections as ProfileFieldKey[] | null) ?? defaultRulesForSlug(blueprintSlug).fields,
  };
}

export async function loadProfilePlaybook(
  workspaceId: string,
  blueprintSlug: string,
): Promise<{
  systemRules: ProfileFillRulesDocument;
  settings: ProfilePlaybookSettings | null;
  blueprintVersion: number;
}> {
  const admin = createAdminClient();

  const { data: blueprint } = await admin
    .from("playbook_blueprints")
    .select("fill_rules, version")
    .eq("slug", blueprintSlug)
    .maybeSingle();

  const systemRules =
    (blueprint?.fill_rules as ProfileFillRulesDocument | null) ?? defaultRulesForSlug(blueprintSlug);

  const { data: settingsRow } = await admin
    .from("profile_playbook_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", blueprintSlug)
    .maybeSingle();

  return {
    systemRules,
    settings: settingsRow ? mapSettingsRow(settingsRow as Record<string, unknown>, blueprintSlug) : null,
    blueprintVersion: blueprint?.version ?? 1,
  };
}

export function loadPeopleProfilePlaybook(workspaceId: string) {
  return loadProfilePlaybook(workspaceId, PEOPLE_PROFILE_SLUG);
}
