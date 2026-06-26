"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { scheduleRelationshipHealthRecompute } from "@/app/_features/people/health/recompute";
import { capturePlaybookLearningSignal } from "@/app/_features/plays/playbooks/learning/capture-signals";
import { writeProfileFieldProvenance } from "@/app/_features/plays/playbooks/profile/write-provenance";
import { PEOPLE_PROFILE_SLUG } from "@/app/_features/plays/playbooks/profile/apply-person-profile";
import type { PersonProfileFieldKey } from "@/app/_features/plays/playbooks/profile/types";
import type { ProfileFillRulesDocument } from "@/app/_features/plays/playbooks/profile/types";
import { validateProfileRules } from "@/app/_features/plays/playbooks/profile/validate-rules";
import type { ActionResult } from "@/app/_features/plays/actions";

function slugifyOrganizationName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "organization"
  );
}

async function updatePrimaryOrganizationLink(input: {
  admin: ReturnType<typeof createAdminClient>;
  workspaceId: string;
  personId: string;
  organizationName: string;
}): Promise<string | null> {
  const organizationName = input.organizationName.trim();

  if (!organizationName) {
    const { error: clearPrimaryError } = await input.admin
      .from("organization_people")
      .update({ is_primary: false })
      .eq("person_id", input.personId)
      .eq("is_primary", true);

    return clearPrimaryError?.message ?? null;
  }

  const { data: existingOrg, error: existingOrgError } = await input.admin
    .from("organizations")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("name", organizationName)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingOrgError) return existingOrgError.message;

  let organizationId = (existingOrg?.id as string | undefined) ?? null;

  if (!organizationId) {
    const { data: createdOrg, error: createOrgError } = await input.admin
      .from("organizations")
      .insert({
        workspace_id: input.workspaceId,
        name: organizationName,
        slug: slugifyOrganizationName(organizationName),
        relationship_status: "prospect",
        metadata: {},
      })
      .select("id")
      .single();

    if (createOrgError) return createOrgError.message;
    organizationId = (createdOrg.id as string | undefined) ?? null;
  }

  if (!organizationId) return "Could not resolve organization";

  const { error: clearPrimaryError } = await input.admin
    .from("organization_people")
    .update({ is_primary: false })
    .eq("person_id", input.personId)
    .eq("is_primary", true);

  if (clearPrimaryError) return clearPrimaryError.message;

  const { error: linkError } = await input.admin.from("organization_people").upsert(
    {
      organization_id: organizationId,
      person_id: input.personId,
      is_primary: true,
    },
    { onConflict: "organization_id,person_id" },
  );

  return linkError?.message ?? null;
}

export async function correctPersonProfileField(input: {
  personId: string;
  field: PersonProfileFieldKey;
  value: string;
}): Promise<ActionResult<{ personId: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const admin = createAdminClient();

  const { data: person, error: personError } = await admin
    .from("people")
    .select("id")
    .eq("id", input.personId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (personError || !person) {
    return {
      ok: false,
      errorCode: "PERSON_NOT_FOUND",
      message: personError?.message ?? "Person not found",
    };
  }

  const patch: Record<string, string> = {};
  if (input.field === "relationship_type") {
    patch.relationship_type = input.value;
  } else if (input.field === "title") {
    patch.title = input.value;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin
      .from("people")
      .update(patch)
      .eq("id", input.personId)
      .eq("workspace_id", workspace.id);

    if (error) {
      return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
    }

    if (input.field === "relationship_type") {
      scheduleRelationshipHealthRecompute(input.personId);
    }
  }

  if (input.field === "org_link") {
    const error = await updatePrimaryOrganizationLink({
      admin,
      workspaceId: workspace.id,
      personId: input.personId,
      organizationName: input.value,
    });

    if (error) {
      return { ok: false, errorCode: "ORG_LINK_FAILED", message: error };
    }
  }

  await writeProfileFieldProvenance({
    workspaceId: workspace.id,
    entityType: "person",
    entityId: input.personId,
    field: input.field,
    value: input.value,
    source: "manual",
    ruleId: null,
    confidence: 100,
    evidence: { because: "You corrected this field" },
    blueprintSlug: PEOPLE_PROFILE_SLUG,
    blueprintVersion: 1,
    status: "applied",
  });

  await capturePlaybookLearningSignal({
    workspaceId: workspace.id,
    blueprintSlug: PEOPLE_PROFILE_SLUG,
    templateId: null,
    playRunId: null,
    signalType: "edited",
    delta: {
      field: input.field,
      value: input.value,
    },
  });

  revalidatePath(`/people/${input.personId}`);
  revalidatePath("/people");
  revalidatePath("/plays");

  return { ok: true, data: { personId: input.personId } };
}

export async function updateProfilePlaybookSettings(input: {
  blueprintSlug: string;
  contextFacts?: {
    workspace_domains?: string[];
    partner_domains?: string[];
    vendor_domains?: string[];
  };
  autoApplyThreshold?: number;
  aiFallbackEnabled?: boolean;
  fillRulesOverride?: ProfileFillRulesDocument | null;
}): Promise<ActionResult<{ blueprintSlug: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const { error } = await admin.from("profile_playbook_settings").upsert(
    {
      workspace_id: workspace.id,
      blueprint_slug: input.blueprintSlug,
      context_facts: input.contextFacts ?? {},
      auto_apply_threshold: input.autoApplyThreshold ?? 85,
      ai_fallback_enabled: input.aiFallbackEnabled ?? true,
      fill_rules_override: input.fillRulesOverride ?? undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,blueprint_slug" },
  );

  if (error) {
    return { ok: false, errorCode: "SETTINGS_FAILED", message: error.message };
  }

  revalidatePath("/plays");
  return { ok: true, data: { blueprintSlug: input.blueprintSlug } };
}

export async function updateProfileContextFacts(input: {
  workspace_domains?: string[];
  partner_domains?: string[];
  vendor_domains?: string[];
}): Promise<ActionResult<{ blueprintSlug: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profile_playbook_settings")
    .select("auto_apply_threshold, ai_fallback_enabled, fill_rules_override")
    .eq("workspace_id", workspace.id)
    .eq("blueprint_slug", PEOPLE_PROFILE_SLUG)
    .maybeSingle();

  const { error } = await admin.from("profile_playbook_settings").upsert(
    {
      workspace_id: workspace.id,
      blueprint_slug: PEOPLE_PROFILE_SLUG,
      context_facts: {
        workspace_domains: input.workspace_domains ?? [],
        partner_domains: input.partner_domains ?? [],
        vendor_domains: input.vendor_domains ?? [],
      },
      auto_apply_threshold: existing?.auto_apply_threshold ?? 85,
      ai_fallback_enabled: existing?.ai_fallback_enabled ?? true,
      fill_rules_override: existing?.fill_rules_override ?? undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,blueprint_slug" },
  );

  if (error) {
    return { ok: false, errorCode: "CONTEXT_FACTS_FAILED", message: error.message };
  }

  revalidatePath("/me");
  revalidatePath("/plays");
  return { ok: true, data: { blueprintSlug: PEOPLE_PROFILE_SLUG } };
}

export async function saveProfileRulesOverride(input: {
  blueprintSlug: string;
  fillRulesOverride: ProfileFillRulesDocument | null;
}): Promise<ActionResult<{ blueprintSlug: string }>> {
  if (input.fillRulesOverride) {
    const validation = validateProfileRules(input.fillRulesOverride);
    if (!validation.ok) {
      return {
        ok: false,
        errorCode: "INVALID_RULES",
        message: validation.errors.join("; "),
      };
    }
  }

  return updateProfilePlaybookSettings({
    blueprintSlug: input.blueprintSlug,
    fillRulesOverride: input.fillRulesOverride,
  });
}

export async function approveProfileFieldSuggestion(input: {
  personId: string;
  field: PersonProfileFieldKey;
}): Promise<ActionResult<{ personId: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const { data: pendingRow } = await admin
    .from("profile_field_provenance")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("entity_type", "person")
    .eq("entity_id", input.personId)
    .eq("field", input.field)
    .eq("status", "pending")
    .order("set_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingRow) {
    return { ok: false, errorCode: "NOT_FOUND", message: "No pending suggestion for this field" };
  }

  const valueObj = pendingRow.value as { text?: string } | null;
  const value = valueObj?.text ?? null;

  const { data: person, error: personError } = await admin
    .from("people")
    .select("id")
    .eq("id", input.personId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (personError || !person) {
    return {
      ok: false,
      errorCode: "PERSON_NOT_FOUND",
      message: personError?.message ?? "Person not found",
    };
  }

  if (value && input.field === "relationship_type") {
    await admin
      .from("people")
      .update({ relationship_type: value })
      .eq("id", input.personId)
      .eq("workspace_id", workspace.id);
    scheduleRelationshipHealthRecompute(input.personId);
  }

  if (value && input.field === "title") {
    await admin
      .from("people")
      .update({ title: value })
      .eq("id", input.personId)
      .eq("workspace_id", workspace.id);
  }

  if (value && input.field === "org_link") {
    const error = await updatePrimaryOrganizationLink({
      admin,
      workspaceId: workspace.id,
      personId: input.personId,
      organizationName: value,
    });

    if (error) {
      return { ok: false, errorCode: "ORG_LINK_FAILED", message: error };
    }
  }

  await admin
    .from("profile_field_provenance")
    .update({ status: "applied" })
    .eq("id", pendingRow.id);

  revalidatePath(`/people/${input.personId}`);
  return { ok: true, data: { personId: input.personId } };
}
