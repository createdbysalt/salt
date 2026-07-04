import "server-only";

/**
 * System Play Executor
 *
 * Executes system plays — the immutable core operations.
 *
 * Safety constraints:
 * - Entities: create, update, archive (NEVER delete)
 * - Links: link, unlink (simple add/remove)
 *
 * All operations are workspace-scoped and audit-logged.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { reportError } from "@/app/_lib/errors";
import { evaluateWorkProfileFields, WORK_PROFILE_SLUG } from "@/app/_features/plays/playbooks/records-engine/apply-work-profile";
import { loadProfilePlaybook } from "@/app/_features/plays/playbooks/records-engine/load-profile-playbook";
import { applyProfileFieldResults } from "@/app/_features/plays/playbooks/records-engine/write-provenance";
import { scheduleWorkHealthRecompute } from "@/app/_features/work/health/recompute";
import { relationshipTypeToStatus } from "@/app/_features/people/records-engine";
import {
  assertEntitiesInWorkspace,
  EntityNotInWorkspaceError,
  linkTypeToGuardType,
} from "./workspace-guard";
import { upsertEdge } from "@/app/_features/memory/lib/edge-store";
import type {
  SystemPlaySlug,
  SystemPlayResult,
  CreatePersonInput,
  UpdatePersonInput,
  ArchivePersonInput,
  ClassifyPersonInput,
  CreateOrgInput,
  UpdateOrgInput,
  ArchiveOrgInput,
  CreateWorkInput,
  UpdateWorkInput,
  ArchiveWorkInput,
  LinkPersonOrgInput,
  LinkPersonWorkInput,
  LinkPersonPersonInput,
  LinkPersonSpaceInput,
  LinkOrgWorkInput,
  LinkWorkSpaceInput,
  CreateNoteInput,
  AttachEmailInput,
  CreateMeetingInput,
  CreateClientMeetingInput,
} from "./types";
import {
  ensureUniqueProjectSlug,
  resolvePrimaryOrgIdForPerson,
  resolveWorkParents,
} from "./project-fields";

async function applyWorkProfileAfterChange(input: {
  workspaceId: string;
  workId: string;
  name: string;
  currentStatus?: string | null;
  currentDescription?: string | null;
  currentDeadline?: string | null;
  currentStartDate?: string | null;
  created?: boolean;
}) {
  const profilePlaybook = await loadProfilePlaybook(input.workspaceId, WORK_PROFILE_SLUG);
  const evaluation = evaluateWorkProfileFields({
    name: input.name,
    currentStatus: input.currentStatus,
    currentDescription: input.currentDescription,
    currentDeadline: input.currentDeadline,
    currentStartDate: input.currentStartDate,
    signals: {
      work_created: Boolean(input.created),
      inferred_description: input.currentDescription ?? null,
      inferred_deadline: input.currentDeadline ?? null,
      inferred_start_date: input.currentStartDate ?? null,
      work_has_due_date: Boolean(input.currentDeadline),
    },
    systemRules: profilePlaybook.systemRules,
    settings: profilePlaybook.settings,
    blueprintVersion: profilePlaybook.blueprintVersion,
  });

  await applyProfileFieldResults({
    workspaceId: input.workspaceId,
    entityType: "work",
    entityId: input.workId,
    results: evaluation.results,
    blueprintSlug: evaluation.blueprintSlug,
    blueprintVersion: evaluation.blueprintVersion,
  });
}

// ============================================================================
// Main Executor
// ============================================================================

export async function executeSystemPlay(
  workspaceId: string,
  slug: SystemPlaySlug,
  input: unknown,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const admin = createAdminClient();

  try {
    switch (slug) {
      // ========================================================================
      // PERSON OPERATIONS
      // ========================================================================
      case "system:create-person":
        return await createPerson(admin, workspaceId, input as CreatePersonInput, actorUserId);

      case "system:update-person":
        return await updatePerson(admin, workspaceId, input as UpdatePersonInput);

      case "system:archive-person":
        return await archivePerson(admin, workspaceId, input as ArchivePersonInput);

      case "system:classify-person":
        return await classifyPerson(admin, workspaceId, input as ClassifyPersonInput);

      // ========================================================================
      // ORG OPERATIONS
      // ========================================================================
      case "system:create-org":
        return await createOrg(admin, workspaceId, input as CreateOrgInput, actorUserId);

      case "system:update-org":
        return await updateOrg(admin, workspaceId, input as UpdateOrgInput);

      case "system:archive-org":
        return await archiveOrg(admin, workspaceId, input as ArchiveOrgInput);

      // ========================================================================
      // WORK OPERATIONS
      // ========================================================================
      case "system:create-work":
        return await createWork(admin, workspaceId, input as CreateWorkInput, actorUserId);

      case "system:update-work":
        return await updateWork(admin, workspaceId, input as UpdateWorkInput);

      case "system:archive-work":
        return await archiveWork(admin, workspaceId, input as ArchiveWorkInput);

      // ========================================================================
      // LINK OPERATIONS (graph edges)
      // ========================================================================
      case "system:link-person-org":
        return await linkEntities(admin, workspaceId, "person", (input as LinkPersonOrgInput).person_id, "org", (input as LinkPersonOrgInput).org_id, actorUserId);

      case "system:unlink-person-org":
        return await unlinkEntities(admin, workspaceId, "person", (input as LinkPersonOrgInput).person_id, "org", (input as LinkPersonOrgInput).org_id);

      case "system:link-person-work":
        return await linkEntities(admin, workspaceId, "person", (input as LinkPersonWorkInput).person_id, "work", (input as LinkPersonWorkInput).work_id, actorUserId);

      case "system:unlink-person-work":
        return await unlinkEntities(admin, workspaceId, "person", (input as LinkPersonWorkInput).person_id, "work", (input as LinkPersonWorkInput).work_id);

      case "system:link-person-person":
        return await linkEntities(admin, workspaceId, "person", (input as LinkPersonPersonInput).person_id, "person", (input as LinkPersonPersonInput).target_person_id, actorUserId);

      case "system:unlink-person-person":
        return await unlinkEntities(admin, workspaceId, "person", (input as LinkPersonPersonInput).person_id, "person", (input as LinkPersonPersonInput).target_person_id);

      case "system:link-person-space":
        return await linkEntities(admin, workspaceId, "person", (input as LinkPersonSpaceInput).person_id, "space", (input as LinkPersonSpaceInput).space_id, actorUserId);

      case "system:unlink-person-space":
        return await unlinkEntities(admin, workspaceId, "person", (input as LinkPersonSpaceInput).person_id, "space", (input as LinkPersonSpaceInput).space_id);

      case "system:link-org-work":
        return await linkEntities(admin, workspaceId, "org", (input as LinkOrgWorkInput).org_id, "work", (input as LinkOrgWorkInput).work_id, actorUserId);

      case "system:unlink-org-work":
        return await unlinkEntities(admin, workspaceId, "org", (input as LinkOrgWorkInput).org_id, "work", (input as LinkOrgWorkInput).work_id);

      case "system:link-work-space":
        return await linkEntities(admin, workspaceId, "work", (input as LinkWorkSpaceInput).work_id, "space", (input as LinkWorkSpaceInput).space_id, actorUserId);

      case "system:unlink-work-space":
        return await unlinkEntities(admin, workspaceId, "work", (input as LinkWorkSpaceInput).work_id, "space", (input as LinkWorkSpaceInput).space_id);

      // ========================================================================
      // NOTE & ATTACHMENT OPERATIONS
      // ========================================================================
      case "system:create-note":
        return await createNote(admin, workspaceId, input as CreateNoteInput, actorUserId);

      case "system:attach-email":
        return await attachEmail(admin, workspaceId, input as AttachEmailInput);

      case "system:create-meeting":
        return await createMeeting(admin, workspaceId, input as CreateMeetingInput, actorUserId);

      case "system:create-client-meeting":
        return await createClientMeeting(admin, workspaceId, input as CreateClientMeetingInput, actorUserId);

      default:
        return { success: false, error: `Unknown system play: ${slug}` };
    }
  } catch (error) {
    console.error(`[system-play] Error executing ${slug}:`, error);
    if (error instanceof EntityNotInWorkspaceError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// PERSON IMPLEMENTATIONS
// ============================================================================

async function createPerson(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreatePersonInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const email = input?.email?.toLowerCase().trim();

  if (email) {
    const { data: existing } = await admin
      .from("people")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        entity_id: existing.id,
        entity_type: "person",
        data: existing,
      };
    }
  }

  if (!input?.name?.trim()) {
    return { success: false, error: "Provide name or email to create a person" };
  }

  const { data, error } = await admin
    .from("people")
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      email: email ?? null,
      title: input.title ?? null,
      relationship_type: input.relationship_type ?? "unknown",
      relationship_status:
        input.relationship_status ?? relationshipTypeToStatus(input.relationship_type),
      created_via: input.created_via ?? "system_play",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity(admin, workspaceId, "created", "Person created", input.name, actorUserId);

  return {
    success: true,
    entity_id: data.id,
    entity_type: "person",
    data,
  };
}

async function updatePerson(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: UpdatePersonInput
): Promise<SystemPlayResult> {
  await assertEntitiesInWorkspace(admin, workspaceId, [
    { type: "person", id: input.person_id },
  ]);

  const { error } = await admin
    .from("people")
    .update({
      ...input.fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.person_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.person_id, entity_type: "person" };
}

async function archivePerson(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: ArchivePersonInput
): Promise<SystemPlayResult> {
  await assertEntitiesInWorkspace(admin, workspaceId, [
    { type: "person", id: input.person_id },
  ]);

  const { error } = await admin
    .from("people")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.person_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.person_id, entity_type: "person" };
}

async function classifyPerson(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: ClassifyPersonInput
): Promise<SystemPlayResult> {
  await assertEntitiesInWorkspace(admin, workspaceId, [
    { type: "person", id: input.person_id },
  ]);

  const { error } = await admin
    .from("people")
    .update({
      relationship_type: input.relationship_type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.person_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.person_id, entity_type: "person" };
}

// ============================================================================
// ORG IMPLEMENTATIONS
// ============================================================================

async function createOrg(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateOrgInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const domain = input.domain?.toLowerCase().trim();

  if (domain) {
    const { data: existing } = await admin
      .from("organizations")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("domain", domain)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        entity_id: existing.id,
        entity_type: "org",
        data: existing,
      };
    }
  }

  const { data, error } = await admin
    .from("organizations")
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      domain: domain ?? null,
      created_via: "system_play",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity(admin, workspaceId, "created", "Org created", input.name, actorUserId);

  return {
    success: true,
    entity_id: data.id,
    entity_type: "org",
    data,
  };
}

async function updateOrg(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: UpdateOrgInput
): Promise<SystemPlayResult> {
  await assertEntitiesInWorkspace(admin, workspaceId, [
    { type: "org", id: input.org_id },
  ]);

  const { error } = await admin
    .from("organizations")
    .update({
      ...input.fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.org_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.org_id, entity_type: "org" };
}

async function archiveOrg(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: ArchiveOrgInput
): Promise<SystemPlayResult> {
  await assertEntitiesInWorkspace(admin, workspaceId, [
    { type: "org", id: input.org_id },
  ]);

  const { error } = await admin
    .from("organizations")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.org_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.org_id, entity_type: "org" };
}

// ============================================================================
// WORK IMPLEMENTATIONS
// ============================================================================

async function createWork(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateWorkInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const parentChecks: Array<{ type: "person" | "org"; id: string }> = [];
  if (input.person_id) {
    parentChecks.push({ type: "person", id: input.person_id });
  }
  if (input.org_id) {
    parentChecks.push({ type: "org", id: input.org_id });
  }
  if (parentChecks.length > 0) {
    await assertEntitiesInWorkspace(admin, workspaceId, parentChecks);
  }

  try {
    const [parents, slug] = await Promise.all([
      resolveWorkParents(admin, workspaceId, {
        org_id: input.org_id,
        person_id: input.person_id,
      }),
      ensureUniqueProjectSlug(admin, workspaceId, input.name),
    ]);

    const { data, error } = await admin
      .from("work")
      .insert({
        workspace_id: workspaceId,
        person_id: parents.personId,
        organization_id: parents.organizationId,
        name: input.name,
        slug,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logActivity(admin, workspaceId, "created", "Work created", input.name, actorUserId);

    scheduleWorkHealthRecompute(data.id);

    await applyWorkProfileAfterChange({
      workspaceId,
      workId: data.id,
      name: input.name,
      currentStatus: "active",
      created: true,
    });

    return {
      success: true,
      entity_id: data.id,
      entity_type: "work",
      data,
    };
  } catch (error) {
    const report = reportError({
      scope: "system-play.create-work",
      error,
      action: "while creating that work item",
      context: {
        workspaceId,
        actorUserId: actorUserId ?? null,
        orgId: input.org_id ?? null,
        personId: input.person_id ?? null,
      },
    });
    return { success: false, error: report.userMessage, error_id: report.errorId };
  }
}

async function updateWork(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: UpdateWorkInput
): Promise<SystemPlayResult> {
  await assertEntitiesInWorkspace(admin, workspaceId, [
    { type: "work", id: input.work_id },
  ]);

  const { error } = await admin
    .from("work")
    .update({
      ...input.fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.work_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  const { data: project } = await admin
    .from("work")
    .select("id, name, status, description, deadline, start_date")
    .eq("id", input.work_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (project) {
    await applyWorkProfileAfterChange({
      workspaceId,
      workId: input.work_id,
      name: project.name,
      currentStatus: (project.status as string | null) ?? null,
      currentDescription: (project.description as string | null) ?? null,
      currentDeadline: (project.deadline as string | null) ?? null,
      currentStartDate: (project.start_date as string | null) ?? null,
    });
  }

  return { success: true, entity_id: input.work_id, entity_type: "work" };
}

async function archiveWork(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: ArchiveWorkInput
): Promise<SystemPlayResult> {
  await assertEntitiesInWorkspace(admin, workspaceId, [
    { type: "work", id: input.work_id },
  ]);

  const { error } = await admin
    .from("work")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.work_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.work_id, entity_type: "work" };
}

// ============================================================================
// LINK IMPLEMENTATIONS (graph edges)
// ============================================================================

async function linkEntities(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  sourceType: string,
  sourceId: string,
  targetType: string,
  targetId: string,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const sourceGuard = linkTypeToGuardType(sourceType);
  const targetGuard = linkTypeToGuardType(targetType);
  const guardChecks: Array<{ type: "person" | "org" | "work" | "space"; id: string }> = [];

  if (sourceGuard) {
    guardChecks.push({ type: sourceGuard, id: sourceId });
  }
  if (targetGuard) {
    guardChecks.push({ type: targetGuard, id: targetId });
  }
  if (guardChecks.length > 0) {
    await assertEntitiesInWorkspace(admin, workspaceId, guardChecks);
  }

  const { error } = await admin.from("entity_links").insert({
    workspace_id: workspaceId,
    source_type: sourceType,
    source_id: sourceId,
    target_type: targetType,
    target_id: targetId,
    relation_type: "related",
    source: "system",
    created_by: actorUserId,
  });

  if (error) {
    // Duplicate link is okay - return success
    if (error.code === "23505") {
      return { success: true };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function unlinkEntities(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  sourceType: string,
  sourceId: string,
  targetType: string,
  targetId: string
): Promise<SystemPlayResult> {
  const sourceGuard = linkTypeToGuardType(sourceType);
  const targetGuard = linkTypeToGuardType(targetType);
  const guardChecks: Array<{ type: "person" | "org" | "work" | "space"; id: string }> = [];

  if (sourceGuard) {
    guardChecks.push({ type: sourceGuard, id: sourceId });
  }
  if (targetGuard) {
    guardChecks.push({ type: targetGuard, id: targetId });
  }
  if (guardChecks.length > 0) {
    await assertEntitiesInWorkspace(admin, workspaceId, guardChecks);
  }

  const { error } = await admin
    .from("entity_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// NOTE & ATTACHMENT IMPLEMENTATIONS
// ============================================================================

async function createNote(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateNoteInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  await assertEntitiesInWorkspace(admin, workspaceId, [
    { type: input.target_type, id: input.target_id },
  ]);

  const { data, error } = await admin
    .from("notes")
    .insert({
      workspace_id: workspaceId,
      content: input.content,
      author_type: "salt",
      created_by: actorUserId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const edgeResult = await upsertEdge(admin, {
    workspaceId,
    source: { type: "note", id: data.id },
    target: { type: input.target_type, id: input.target_id },
    relationType: "mention",
    provenance: { source: "system", because: "Note created by a system play" },
    createdBy: actorUserId ?? null,
  });

  if (!edgeResult.ok) {
    return { success: false, error: edgeResult.message };
  }

  return {
    success: true,
    entity_id: data.id,
    entity_type: "note",
    data,
  };
}

async function attachEmail(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: AttachEmailInput
): Promise<SystemPlayResult> {
  // Update the capture_event to link to the target entity
  const updateField =
    input.target_type === "person"
      ? { resolved_person_id: input.target_id }
      : input.target_type === "org"
        ? { resolved_org_id: input.target_id }
        : {};

  if (Object.keys(updateField).length === 0) {
    return { success: false, error: "Invalid target type for email attachment" };
  }

  const { error } = await admin
    .from("capture_events")
    .update(updateField)
    .eq("id", input.email_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function createMeeting(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateMeetingInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const externalId =
    input.external_id ?? `memory_plan_meeting:${crypto.randomUUID()}`;

  const { data: existing } = await admin
    .from("capture_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing?.id) {
    return {
      success: true,
      entity_id: existing.id,
      entity_type: "meeting",
      data: existing,
    };
  }

  const { data, error } = await admin
    .from("capture_events")
    .insert({
      workspace_id: workspaceId,
      source_type: "gmail",
      capture_type: "meeting",
      origin: "found",
      external_id: externalId,
      title: input.title,
      raw_payload: input.source_capture_id
        ? { source_capture_id: input.source_capture_id }
        : {},
      extracted_data: {
        type: "meeting",
        title: input.title,
        start: input.start_at,
        end: input.end_at,
        location: input.location,
        calendar_id: input.calendar_id,
      },
      state: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await admin.from("capture_routing_decisions").insert({
    capture_event_id: data.id,
    target_surface: "meetings",
    confidence: 95,
    status: "approved",
    routing_action: "route",
    routed_at: new Date().toISOString(),
  });

  await admin
    .from("capture_events")
    .update({ state: "routed", processed_at: new Date().toISOString() })
    .eq("id", data.id);

  await logActivity(
    admin,
    workspaceId,
    "created",
    "Meeting created",
    input.title,
    actorUserId
  );

  return {
    success: true,
    entity_id: data.id,
    entity_type: "meeting",
    data,
  };
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

async function logActivity(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  action: string,
  title: string,
  detail?: string,
  actorUserId?: string
): Promise<void> {
  await admin.from("activity_entries").insert({
    workspace_id: workspaceId,
    action,
    title,
    detail,
    actor_user_id: actorUserId,
    metadata: { source: "system_play" },
  });
}

// ============================================================================
// CLIENT MEETING (Manual Meetings via Ask Salt)
// ============================================================================

async function createClientMeeting(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateClientMeetingInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  // Look up the person in this workspace
  const { data: person, error: personError } = await admin
    .from("people")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("id", input.person_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (personError) {
    return { success: false, error: `Failed to find person: ${personError.message}` };
  }

  if (!person) {
    return { success: false, error: "Person not found in Memory. Use memory_find_people to get a valid person_id." };
  }

  // Resolve the person's primary organization (optional - meetings can be person-only)
  let organizationId: string | null = null;
  try {
    organizationId = await resolvePrimaryOrgIdForPerson(admin, workspaceId, person.id);
  } catch {
    organizationId = null;
  }

  // If work_id provided, verify it exists
  if (input.work_id) {
    const { data: work } = await admin
      .from("work")
      .select("id")
      .eq("id", input.work_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!work) {
      return { success: false, error: "Work/project not found. Use memory_create_work to create it first." };
    }
  }

  // Calculate end_time if not provided (default to 30 minutes after start)
  let endTime = input.end_time;
  if (!endTime) {
    const startDate = new Date(input.start_time);
    startDate.setMinutes(startDate.getMinutes() + 30);
    endTime = startDate.toISOString();
  }

  // Create the meeting
  const { data: meeting, error: meetingError } = await admin
    .from("meetings")
    .insert({
      workspace_id: workspaceId,
      person_id: person.id,
      organization_id: organizationId,
      project_id: input.work_id ?? null,
      title: input.title,
      description: input.description ?? null,
      meeting_type: input.meeting_type ?? "other",
      start_time: input.start_time,
      end_time: endTime,
      location_type: input.location_type ?? "google-meet",
      meeting_url: input.meeting_url ?? null,
      status: "scheduled",
      visibility: "shared_with_client",
      origin: "internal",
      attendees: [{ name: input.person_name ?? person.name, role: "client" }],
    })
    .select("id, title, start_time, end_time")
    .single();

  if (meetingError) {
    return { success: false, error: `Failed to create meeting: ${meetingError.message}` };
  }

  await logActivity(
    admin,
    workspaceId,
    "created",
    "Meeting scheduled",
    `${input.title} with ${input.person_name ?? person.name}`,
    actorUserId
  );

  return {
    success: true,
    entity_id: meeting.id,
    entity_type: "meeting",
    data: {
      id: meeting.id,
      title: meeting.title,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      person_name: input.person_name ?? person.name,
      href: `/meetings/${meeting.id}`,
    },
  };
}
