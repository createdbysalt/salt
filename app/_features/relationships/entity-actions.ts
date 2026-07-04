"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type {
  RelationshipStatus,
  Organization,
  Person,
  OrganizationRow,
  PersonRow,
} from "./types";
import {
  transformOrganizationRow,
  transformPersonRow,
} from "./types";
import { scheduleOrgHealthRecompute } from "@/app/_features/orgs/health/recompute";

// ============================================================================
// Result Types
// ============================================================================

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Organization Actions
// ============================================================================

export interface CreateOrganizationInput {
  name: string;
  relationshipStatus?: RelationshipStatus;
  website?: string;
  industry?: string;
  address?: string;
  notes?: string;
  primaryContact?: {
    name: string;
    email?: string;
    phone?: string;
    title?: string;
  };
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<ActionResult<Organization>> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    const baseSlug =
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "organization";

    const insertOrg = (slug: string) =>
      supabase
        .from("organizations")
        .insert({
          workspace_id: workspace.id,
          name: input.name,
          slug,
          relationship_status: input.relationshipStatus ?? "prospect",
          website: input.website ?? null,
          industry: input.industry ?? null,
          address: input.address ?? null,
          notes: input.notes ?? null,
          metadata: {},
        })
        .select()
        .single();

    // Slug is UNIQUE per workspace — retry with a suffix on collision so a
    // second "Untitled organization" doesn't silently fail to create.
    let { data: org, error: orgError } = await insertOrg(baseSlug);
    if (orgError?.code === "23505") {
      ({ data: org, error: orgError } = await insertOrg(
        `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`,
      ));
    }

    if (orgError) {
      console.error("Error creating organization:", orgError);
      return { success: false, error: orgError.message };
    }

    const organization = transformOrganizationRow(org as OrganizationRow);

    // Create primary contact if provided
    if (input.primaryContact) {
      const { data: person, error: personError } = await supabase
        .from("people")
        .insert({
          workspace_id: workspace.id,
          name: input.primaryContact.name,
          email: input.primaryContact.email ?? null,
          phone: input.primaryContact.phone ?? null,
          title: input.primaryContact.title ?? null,
          relationship_status: input.relationshipStatus ?? "prospect",
          metadata: {},
        })
        .select()
        .single();

      if (!personError && person) {
        // Link person to organization
        await supabase.from("organization_people").insert({
          organization_id: org.id,
          person_id: person.id,
          role: "Primary Contact",
          is_primary: true,
        });

        organization.primaryContact = transformPersonRow(person as PersonRow);
      }
    }

    revalidatePath("/people");
    revalidatePath("/relationships");

    return { success: true, data: organization };
  } catch (error) {
    console.error("Error in createOrganization:", error);
    return { success: false, error: "Failed to create organization" };
  }
}

export interface UpdateOrganizationInput {
  name?: string;
  relationshipStatus?: RelationshipStatus;
  website?: string;
  industry?: string;
  address?: string;
  notes?: string;
}

export async function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationInput
): Promise<ActionResult> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) {
      updateData.name = input.name;
      updateData.slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    if (input.relationshipStatus !== undefined) {
      updateData.relationship_status = input.relationshipStatus;
    }
    if (input.website !== undefined) updateData.website = input.website || null;
    if (input.industry !== undefined) updateData.industry = input.industry || null;
    if (input.address !== undefined) updateData.address = input.address || null;
    if (input.notes !== undefined) updateData.notes = input.notes || null;

    const { data: org, error } = await supabase
      .from("organizations")
      .update(updateData)
      .eq("id", organizationId)
      .eq("workspace_id", workspace.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating organization:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/orgs/${organizationId}`);
    revalidatePath("/orgs");
    revalidatePath(`/people/${organizationId}`);
    revalidatePath(`/relationships/organizations/${organizationId}`);
    revalidatePath("/people");
    revalidatePath("/relationships");

    return { success: true };
  } catch (error) {
    console.error("Error in updateOrganization:", error);
    return { success: false, error: "Failed to update organization" };
  }
}

export async function deleteOrganization(
  organizationId: string,
  hard: boolean = false
): Promise<ActionResult> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    if (hard) {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId)
        .eq("workspace_id", workspace.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Soft delete
      const { error } = await supabase
        .from("organizations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", organizationId)
        .eq("workspace_id", workspace.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    revalidatePath("/people");
    revalidatePath("/relationships");

    return { success: true };
  } catch (error) {
    console.error("Error in deleteOrganization:", error);
    return { success: false, error: "Failed to delete organization" };
  }
}

// ============================================================================
// Person Actions
// ============================================================================

export interface CreatePersonInput {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  relationshipStatus?: RelationshipStatus;
  notes?: string;
  organizationId?: string;
  organizationRole?: string;
  isPrimaryContact?: boolean;
}

export async function createPerson(
  input: CreatePersonInput
): Promise<ActionResult<Person>> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: person, error: personError } = await supabase
      .from("people")
      .insert({
        workspace_id: workspace.id,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        title: input.title ?? null,
        relationship_status: input.relationshipStatus ?? "other",
        notes: input.notes ?? null,
        metadata: {},
      })
      .select()
      .single();

    if (personError) {
      console.error("Error creating person:", personError);
      return { success: false, error: personError.message };
    }

    // Link to organization if provided
    if (input.organizationId) {
      await supabase.from("organization_people").insert({
        organization_id: input.organizationId,
        person_id: person.id,
        role: input.organizationRole ?? null,
        is_primary: input.isPrimaryContact ?? false,
      });
    }

    const personEntity = transformPersonRow(person as PersonRow);

    revalidatePath("/people");
    revalidatePath("/relationships");

    return { success: true, data: personEntity };
  } catch (error) {
    console.error("Error in createPerson:", error);
    return { success: false, error: "Failed to create person" };
  }
}

export interface UpdatePersonInput {
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  relationshipStatus?: RelationshipStatus;
  notes?: string;
}

export async function updatePerson(
  personId: string,
  input: UpdatePersonInput
): Promise<ActionResult> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email || null;
    if (input.phone !== undefined) updateData.phone = input.phone || null;
    if (input.title !== undefined) updateData.title = input.title || null;
    if (input.relationshipStatus !== undefined) {
      updateData.relationship_status = input.relationshipStatus;
    }
    if (input.notes !== undefined) updateData.notes = input.notes || null;

    const { data: person, error } = await supabase
      .from("people")
      .update(updateData)
      .eq("id", personId)
      .eq("workspace_id", workspace.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating person:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/people/${personId}`);
    revalidatePath(`/relationships/people/${personId}`);
    revalidatePath("/people");
    revalidatePath("/relationships");

    return { success: true };
  } catch (error) {
    console.error("Error in updatePerson:", error);
    return { success: false, error: "Failed to update person" };
  }
}

export async function deletePerson(
  personId: string,
  hard: boolean = false
): Promise<ActionResult> {
  try {
    const { workspace, supabase } = await getWorkspaceContext();

    if (hard) {
      const { error } = await supabase
        .from("people")
        .delete()
        .eq("id", personId)
        .eq("workspace_id", workspace.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Soft delete
      const { error } = await supabase
        .from("people")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", personId)
        .eq("workspace_id", workspace.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    revalidatePath("/people");
    revalidatePath("/relationships");

    return { success: true };
  } catch (error) {
    console.error("Error in deletePerson:", error);
    return { success: false, error: "Failed to delete person" };
  }
}

// ============================================================================
// Organization-Person Link Actions
// ============================================================================

export async function linkPersonToOrganization(
  personId: string,
  organizationId: string,
  role?: string,
  isPrimary?: boolean
): Promise<ActionResult> {
  try {
    const { supabase } = await getWorkspaceContext();

    // If setting as primary, unset other primary contacts first
    if (isPrimary) {
      await supabase
        .from("organization_people")
        .update({ is_primary: false })
        .eq("organization_id", organizationId)
        .eq("is_primary", true);
    }

    const { error } = await supabase.from("organization_people").upsert(
      {
        organization_id: organizationId,
        person_id: personId,
        role: role ?? null,
        is_primary: isPrimary ?? false,
      },
      { onConflict: "organization_id,person_id" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/orgs/${organizationId}`);
    revalidatePath("/orgs");
    revalidatePath(`/relationships/organizations/${organizationId}`);
    revalidatePath(`/relationships/people/${personId}`);

    scheduleOrgHealthRecompute(organizationId);

    return { success: true };
  } catch (error) {
    console.error("Error in linkPersonToOrganization:", error);
    return { success: false, error: "Failed to link person to organization" };
  }
}

export async function unlinkPersonFromOrganization(
  personId: string,
  organizationId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await getWorkspaceContext();

    const { error } = await supabase
      .from("organization_people")
      .delete()
      .eq("organization_id", organizationId)
      .eq("person_id", personId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/orgs/${organizationId}`);
    revalidatePath("/orgs");
    revalidatePath(`/relationships/organizations/${organizationId}`);
    revalidatePath(`/relationships/people/${personId}`);

    scheduleOrgHealthRecompute(organizationId);

    return { success: true };
  } catch (error) {
    console.error("Error in unlinkPersonFromOrganization:", error);
    return { success: false, error: "Failed to unlink person from organization" };
  }
}
