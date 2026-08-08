"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { TablesUpdate } from "@/app/_lib/supabase/database.types";
import type { ActionResult } from "@/app/_features/plays/actions";
import type { OrgProfileFieldKey } from "@/app/_features/orgs/types";
import { scheduleOrgHealthRecompute } from "@/app/_features/orgs/health/recompute";
import type { RelationshipStatus } from "@/app/_features/relationships/types";
import { validateRecordName } from "@/app/_features/memory/utils/record-name";
import { ORG_PROFILE_SLUG } from "@/app/_features/plays/playbooks/records-engine/apply-org-profile";
import { writeProfileFieldProvenance } from "@/app/_features/plays/playbooks/records-engine/write-provenance";
import type { OrgProfileFieldKey as OrgProvenanceFieldKey } from "@/app/_features/plays/playbooks/records-engine/types";
import {
  isValidIndustryChild,
  isValidIndustryParent,
} from "@/app/_features/memory/types/taxonomies";

async function writeOrgFieldProvenance(input: {
  workspaceId: string;
  orgId: string;
  field: OrgProvenanceFieldKey;
  value: string | null;
}) {
  await writeProfileFieldProvenance({
    workspaceId: input.workspaceId,
    entityType: "organization",
    entityId: input.orgId,
    field: input.field,
    value: input.value,
    source: "manual",
    ruleId: null,
    confidence: 100,
    evidence: { because: "You corrected this field" },
    blueprintSlug: ORG_PROFILE_SLUG,
    blueprintVersion: 1,
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
    .select("id, industry_parent, relationship_status")
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

  if (input.field === "industry_parent") {
    const value = input.value.trim();
    if (value && !isValidIndustryParent(value)) {
      return { ok: false, errorCode: "INVALID_VALUE", message: "Unknown industry" };
    }
    const { error } = await admin
      .from("organizations")
      .update({
        industry_parent: value || null,
        // Parent change invalidates any child that no longer belongs to it —
        // the editor re-writes industry_child right after this call.
        ...(value ? {} : { industry_child: null }),
      })
      .eq("id", input.orgId)
      .eq("workspace_id", workspace.id);
    if (error) return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  if (input.field === "industry_child") {
    const value = input.value.trim();
    if (value) {
      const parent = org.industry_parent;
      if (!parent || !isValidIndustryParent(parent) || !isValidIndustryChild(parent, value)) {
        return {
          ok: false,
          errorCode: "INVALID_VALUE",
          message: "Sub-industry does not belong to the selected industry",
        };
      }
    }
    const { error } = await admin
      .from("organizations")
      .update({ industry_child: value || null })
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

  if (input.field === "billing_email") {
    const { error } = await admin
      .from("organizations")
      .update({ billing_email: input.value.trim() || null })
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

    // Propagate relationship from person to org if org has none
    if (!org.relationship_status) {
      const { data: person } = await admin
        .from("people")
        .select("relationship_type")
        .eq("id", personId)
        .maybeSingle();

      if (person?.relationship_type) {
        await admin
          .from("organizations")
          .update({ relationship_status: person.relationship_type })
          .eq("id", input.orgId)
          .eq("workspace_id", workspace.id);
      }
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
  revalidatePath("/memory");
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
  const validated = validateRecordName(input.name);
  if (!validated.ok) {
    return { ok: false, errorCode: "INVALID_NAME", message: validated.message };
  }

  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const { error } = await admin
    .from("organizations")
    .update({ name: validated.name })
    .eq("id", input.orgId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  await writeOrgFieldProvenance({
    workspaceId: workspace.id,
    orgId: input.orgId,
    field: "name",
    value: validated.name,
  });

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

  await writeOrgFieldProvenance({
    workspaceId: workspace.id,
    orgId: input.orgId,
    field: "last_contact_at",
    value: input.lastContactAt,
  });

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

  const columnMap: Record<
    OrgAddressField,
    | "address_line_1"
    | "address_line_2"
    | "city"
    | "state"
    | "postal_code"
    | "country"
    | "tax_id"
  > = {
    addressLine1: "address_line_1",
    addressLine2: "address_line_2",
    city: "city",
    state: "state",
    postalCode: "postal_code",
    country: "country",
    taxId: "tax_id",
  };

  const provenanceFieldMap: Record<OrgAddressField, OrgProvenanceFieldKey> = {
    addressLine1: "address_line1",
    addressLine2: "address_line2",
    city: "city",
    state: "state",
    postalCode: "postal_code",
    country: "country",
    taxId: "tax_id",
  };

  const patch: TablesUpdate<"organizations"> = {};
  patch[columnMap[input.field]] = input.value.trim() || null;

  const { error } = await admin
    .from("organizations")
    .update(patch)
    .eq("id", input.orgId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  await writeOrgFieldProvenance({
    workspaceId: workspace.id,
    orgId: input.orgId,
    field: provenanceFieldMap[input.field],
    value: input.value.trim() || null,
  });

  revalidatePath(`/orgs/${input.orgId}`);
  return { ok: true, data: { orgId: input.orgId } };
}
