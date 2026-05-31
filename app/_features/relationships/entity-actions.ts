"use server";

import { revalidatePath } from "next/cache";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import {
  isFeatureEnabled,
  FeatureFlag,
} from "@/app/_lib/feature-flags";
import type {
  RelationshipStatus,
  Organization,
  Person,
  OrganizationRow,
  PersonRow,
  LIFECYCLE_TO_RELATIONSHIP_MAP,
} from "./types";
import {
  transformOrganizationRow,
  transformPersonRow,
  LIFECYCLE_TO_RELATIONSHIP_MAP as lifecycleMap,
} from "./types";

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
    const { studio, supabase } = await getStudioContext();

    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        studio_id: studio.id,
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
          studio_id: studio.id,
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

    // Dual-write to old clients table if flag is enabled
    if (isFeatureEnabled(FeatureFlag.DUAL_WRITE_ENTITIES)) {
      await dualWriteOrganizationToClient(studio.id, org, supabase);
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
    const { studio, supabase } = await getStudioContext();

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
      .eq("studio_id", studio.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating organization:", error);
      return { success: false, error: error.message };
    }

    // Dual-write to old clients table if flag is enabled
    if (isFeatureEnabled(FeatureFlag.DUAL_WRITE_ENTITIES) && org.migrated_from_client_id) {
      await supabase
        .from("clients")
        .update({
          name: updateData.name,
          notes: updateData.notes,
          slug: updateData.slug,
        })
        .eq("id", org.migrated_from_client_id)
        .eq("studio_id", studio.id);
    }

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
    const { studio, supabase } = await getStudioContext();

    if (hard) {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId)
        .eq("studio_id", studio.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Soft delete
      const { error } = await supabase
        .from("organizations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", organizationId)
        .eq("studio_id", studio.id);

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
    const { studio, supabase } = await getStudioContext();

    const { data: person, error: personError } = await supabase
      .from("people")
      .insert({
        studio_id: studio.id,
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

    // Dual-write to old clients table if flag is enabled
    if (isFeatureEnabled(FeatureFlag.DUAL_WRITE_ENTITIES)) {
      await dualWritePersonToClient(studio.id, person, supabase);
    }

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
    const { studio, supabase } = await getStudioContext();

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
      .eq("studio_id", studio.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating person:", error);
      return { success: false, error: error.message };
    }

    // Dual-write to old clients table if flag is enabled
    if (isFeatureEnabled(FeatureFlag.DUAL_WRITE_ENTITIES) && person.migrated_from_client_id) {
      await supabase
        .from("clients")
        .update({
          name: updateData.name,
          contact_email: updateData.email,
          contact_phone: updateData.phone,
          notes: updateData.notes,
        })
        .eq("id", person.migrated_from_client_id)
        .eq("studio_id", studio.id);
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
    const { studio, supabase } = await getStudioContext();

    if (hard) {
      const { error } = await supabase
        .from("people")
        .delete()
        .eq("id", personId)
        .eq("studio_id", studio.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Soft delete
      const { error } = await supabase
        .from("people")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", personId)
        .eq("studio_id", studio.id);

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
    const { supabase } = await getStudioContext();

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

    revalidatePath(`/relationships/organizations/${organizationId}`);
    revalidatePath(`/relationships/people/${personId}`);

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
    const { supabase } = await getStudioContext();

    const { error } = await supabase
      .from("organization_people")
      .delete()
      .eq("organization_id", organizationId)
      .eq("person_id", personId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/relationships/organizations/${organizationId}`);
    revalidatePath(`/relationships/people/${personId}`);

    return { success: true };
  } catch (error) {
    console.error("Error in unlinkPersonFromOrganization:", error);
    return { success: false, error: "Failed to unlink person from organization" };
  }
}

// ============================================================================
// Team Actions
// ============================================================================

export interface CreateTeamInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export async function createTeam(
  input: CreateTeamInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { studio, supabase } = await getStudioContext();

    if (!isFeatureEnabled(FeatureFlag.TEAMS_ENABLED)) {
      return { success: false, error: "Teams feature is not enabled" };
    }

    const { data: team, error } = await supabase
      .from("teams")
      .insert({
        studio_id: studio.id,
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? null,
        icon: input.icon ?? null,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/relationships/teams");

    return { success: true, data: { id: team.id } };
  } catch (error) {
    console.error("Error in createTeam:", error);
    return { success: false, error: "Failed to create team" };
  }
}

export async function addTeamMember(
  teamId: string,
  studioMemberId: string,
  role?: string
): Promise<ActionResult> {
  try {
    const { supabase } = await getStudioContext();

    const { error } = await supabase.from("team_members").insert({
      team_id: teamId,
      studio_member_id: studioMemberId,
      role: role ?? null,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Member already in team" };
      }
      return { success: false, error: error.message };
    }

    revalidatePath(`/relationships/teams/${teamId}`);

    return { success: true };
  } catch (error) {
    console.error("Error in addTeamMember:", error);
    return { success: false, error: "Failed to add team member" };
  }
}

export async function removeTeamMember(
  teamId: string,
  studioMemberId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await getStudioContext();

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("studio_member_id", studioMemberId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/relationships/teams/${teamId}`);

    return { success: true };
  } catch (error) {
    console.error("Error in removeTeamMember:", error);
    return { success: false, error: "Failed to remove team member" };
  }
}

// ============================================================================
// Dual-Write Helpers (for migration period)
// ============================================================================

async function dualWriteOrganizationToClient(
  studioId: string,
  org: OrganizationRow,
  supabase: Awaited<ReturnType<typeof getStudioContext>>["supabase"]
): Promise<void> {
  try {
    // Map relationship_status back to lifecycle_stage
    const lifecycleStage = mapRelationshipToLifecycle(org.relationship_status);

    await supabase.from("clients").insert({
      studio_id: studioId,
      name: org.name,
      slug: org.slug,
      client_type: "organization",
      lifecycle_stage: lifecycleStage,
      notes: org.notes,
      status: "active",
    });
  } catch (error) {
    console.error("Error in dual-write organization to client:", error);
  }
}

async function dualWritePersonToClient(
  studioId: string,
  person: PersonRow,
  supabase: Awaited<ReturnType<typeof getStudioContext>>["supabase"]
): Promise<void> {
  try {
    const lifecycleStage = mapRelationshipToLifecycle(person.relationship_status);

    await supabase.from("clients").insert({
      studio_id: studioId,
      name: person.name,
      slug: person.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      client_type: "individual",
      contact_email: person.email,
      contact_phone: person.phone,
      lifecycle_stage: lifecycleStage,
      notes: person.notes,
      status: "active",
    });
  } catch (error) {
    console.error("Error in dual-write person to client:", error);
  }
}

function mapRelationshipToLifecycle(status: RelationshipStatus): string {
  switch (status) {
    case "prospect":
      return "lead";
    case "client":
      return "active";
    case "past_client":
      return "complete";
    case "partner":
    case "vendor":
    case "other":
      return "lead";
    default:
      return "lead";
  }
}
