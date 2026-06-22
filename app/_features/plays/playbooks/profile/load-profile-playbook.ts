import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { PEOPLE_PROFILE_SLUG } from "./apply-person-profile";
import type {
  ProfileContextFacts,
  ProfileFieldKey,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "./types";
import { defaultPeopleProfileRules } from "./validate-rules";

function mapSettingsRow(row: Record<string, unknown>): ProfilePlaybookSettings {
  return {
    autoApplyThreshold: Number(row.auto_apply_threshold ?? 85),
    aiFallbackEnabled: Boolean(row.ai_fallback_enabled ?? true),
    contextFacts: (row.context_facts as ProfileContextFacts) ?? {},
    fillRulesOverride: (row.fill_rules_override as ProfileFillRulesDocument | null) ?? null,
    activeSections: (row.active_sections as ProfileFieldKey[]) ?? [
      "relationship_type",
      "title",
      "org_link",
    ],
  };
}

export async function loadPeopleProfilePlaybook(workspaceId: string): Promise<{
  systemRules: ProfileFillRulesDocument;
  settings: ProfilePlaybookSettings | null;
  blueprintVersion: number;
}> {
  const admin = createAdminClient();

  const { data: blueprint } = await admin
    .from("playbook_blueprints")
    .select("fill_rules, version")
    .eq("slug", PEOPLE_PROFILE_SLUG)
    .maybeSingle();

  const systemRules =
    (blueprint?.fill_rules as ProfileFillRulesDocument | null) ?? defaultPeopleProfileRules();

  const { data: settingsRow } = await admin
    .from("profile_playbook_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", PEOPLE_PROFILE_SLUG)
    .maybeSingle();

  return {
    systemRules,
    settings: settingsRow ? mapSettingsRow(settingsRow as Record<string, unknown>) : null,
    blueprintVersion: blueprint?.version ?? 1,
  };
}
