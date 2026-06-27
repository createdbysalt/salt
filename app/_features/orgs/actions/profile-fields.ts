"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ActionResult } from "@/app/_features/plays/actions";
import type { OrgProfileFieldKey } from "@/app/_features/orgs/types";
import { scheduleOrgHealthRecompute } from "@/app/_features/orgs/health/recompute";
import type { RelationshipStatus } from "@/app/_features/relationships/types";

const ORG_PROFILE_SLUG = "organizations-profile";

async function writeOrgFieldProvenance(input: {
  workspaceId: string;
  orgId: string;
  field: OrgProfileFieldKey;
  value: string;
}) {
  const admin = createAdminClient();
  await admin.from("profile_field_provenance").insert({
    workspace_id: input.workspaceId,
    entity_type: "organization",
    entity_id: input.orgId,
    field: input.field,
    value: { text: input.value },
    source: "manual",
    rule_id: null,
    confidence: 100,
    evidence: { because: "You corrected this field" },
    blueprint_slug: ORG_PROFILE_SLUG,
    blueprint_version: 1,
    status: "applied",
  });
}

export async function correctOrgProfileField(input: {
  orgId: string;
  field: OrgProfileFieldKey;
  value: string;
}): Promise<ActionResult<{ orgId: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id")
    .eq("id", input.orgId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (orgError || !org) {
    return {
      ok: false,
      errorCode: "ORG_NOT_FOUND",
      message: orgError?.message ?? "Organization not found",
    };
  }

  if (input.field === "website") {
    const { error } = await admin
      .from("organizations")
      .update({ website: input.value || null })
      .eq("id", input.orgId)
      .eq("workspace_id", workspace.id);
    if (error) return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  if (input.field === "industry") {
    const { error } = await admin
      .from("organizations")
      .update({ industry: input.value || null })
      .eq("id", input.orgId)
      .eq("workspace_id", workspace.id);
    if (error) return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  if (input.field === "relationship_status") {
    const { error } = await admin
      .from("organizations")
      .update({ relationship_status: input.value as RelationshipStatus })
      .eq("id", input.orgId)
      .eq("workspace_id", workspace.id);
    if (error) return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  if (input.field === "key_contact") {
    const personId = input.value.trim();
    if (!personId) {
      return { ok: false, errorCode: "INVALID_VALUE", message: "Select a key contact" };
    }

    await admin
      .from("organization_people")
      .update({ is_primary: false })
      .eq("organization_id", input.orgId)
      .eq("is_primary", true);

    const { error: linkError } = await admin.from("organization_people").upsert(
      {
        organization_id: input.orgId,
        person_id: personId,
        is_primary: true,
      },
      { onConflict: "organization_id,person_id" },
    );

    if (linkError) {
      return { ok: false, errorCode: "KEY_CONTACT_FAILED", message: linkError.message };
    }
  }

  await writeOrgFieldProvenance({
    workspaceId: workspace.id,
    orgId: input.orgId,
    field: input.field,
    value: input.value,
  });

  revalidatePath(`/orgs/${input.orgId}`);
  revalidatePath("/orgs");
  revalidatePath("/people");
  revalidatePath("/connections");
  revalidatePath("/plays");

  if (input.field === "relationship_status" || input.field === "key_contact") {
    scheduleOrgHealthRecompute(input.orgId);
  }

  return { ok: true, data: { orgId: input.orgId } };
}

export type OrgAddressField =
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "country"
  | "taxId";

export async function updateOrgName(input: {
  orgId: string;
  name: string;
}): Promise<ActionResult<{ orgId: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const { error } = await admin
    .from("organizations")
    .update({ name: input.name.trim() })
    .eq("id", input.orgId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  revalidatePath(`/orgs/${input.orgId}`);
  revalidatePath("/orgs");
  return { ok: true, data: { orgId: input.orgId } };
}

export async function updateOrgLastContact(input: {
  orgId: string;
  lastContactAt: string | null;
}): Promise<ActionResult<{ orgId: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const { error } = await admin
    .from("organizations")
    .update({ last_contact_at: input.lastContactAt })
    .eq("id", input.orgId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  scheduleOrgHealthRecompute(input.orgId);
  revalidatePath(`/orgs/${input.orgId}`);
  return { ok: true, data: { orgId: input.orgId } };
}

export async function updateOrgAddress(input: {
  orgId: string;
  field: OrgAddressField;
  value: string;
}): Promise<ActionResult<{ orgId: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const columnMap: Record<OrgAddressField, string> = {
    addressLine1: "address_line_1",
    addressLine2: "address_line_2",
    city: "city",
    state: "state",
    postalCode: "postal_code",
    country: "country",
    taxId: "tax_id",
  };

  const column = columnMap[input.field];
  const { error } = await admin
    .from("organizations")
    .update({ [column]: input.value.trim() || null })
    .eq("id", input.orgId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  revalidatePath(`/orgs/${input.orgId}`);
  return { ok: true, data: { orgId: input.orgId } };
}
