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
 *
 * Watch expressions (Captures V2 Phase 3):
 * When a Person/Org is created, register their identifiers for continuous awareness.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { registerWatchExpressions } from "../watch-expressions";
import { dispatchSignalTrigger } from "@/app/_features/plays/playbooks/trigger-dispatch";
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
import { toDbEntityType } from "@/app/_features/memory/types/entity-type";
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
  CreateBlockerInput,
  AttachEmailInput,
  CreateMeetingInput,
  CreateClientMeetingInput,
  CreateBillingInput,
  UpdateBillingInput,
  ArchiveBillingInput,
  CreateFileRecordInput,
  UpdateFileRecordInput,
  ArchiveFileRecordInput,
  CreateMeFactInput,
  UpdateMeFactInput,
  ArchiveMeFactInput,
  AssignTagInput,
  UnassignTagInput,
  CreateTagInput,
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

      case "system:add-blocker":
        return await addBlocker(admin, workspaceId, input as CreateBlockerInput, actorUserId);

      case "system:attach-email":
        return await attachEmail(admin, workspaceId, input as AttachEmailInput);

      case "system:create-meeting":
        return await createMeeting(admin, workspaceId, input as CreateMeetingInput, actorUserId);

      case "system:create-client-meeting":
        return await createClientMeeting(admin, workspaceId, input as CreateClientMeetingInput, actorUserId);

      // ========================================================================
      // BILLING OPERATIONS
      // ========================================================================
      case "system:create-billing":
        return await createBilling(admin, workspaceId, input as CreateBillingInput, actorUserId);

      case "system:update-billing":
        return await updateBilling(admin, workspaceId, input as UpdateBillingInput);

      case "system:archive-billing":
        return await archiveBilling(admin, workspaceId, input as ArchiveBillingInput);

      // ========================================================================
      // FILE OPERATIONS
      // ========================================================================
      case "system:create-file":
        return await createFileRecord(admin, workspaceId, input as CreateFileRecordInput, actorUserId);

      case "system:update-file":
        return await updateFileRecord(admin, workspaceId, input as UpdateFileRecordInput);

      case "system:archive-file":
        return await archiveFileRecord(admin, workspaceId, input as ArchiveFileRecordInput);

      // ========================================================================
      // ME / OPERATOR FACT OPERATIONS
      // ========================================================================
      case "system:create-me-fact":
        return await createMeFact(admin, workspaceId, input as CreateMeFactInput, actorUserId);

      case "system:update-me-fact":
        return await updateMeFact(admin, workspaceId, input as UpdateMeFactInput);

      case "system:archive-me-fact":
        return await archiveMeFact(admin, workspaceId, input as ArchiveMeFactInput);

      // ========================================================================
      // TAG OPERATIONS
      // ========================================================================
      case "system:assign-tag":
        return await assignTagToEntity(admin, workspaceId, input as AssignTagInput, actorUserId);

      case "system:unassign-tag":
        return await unassignTagFromEntity(admin, workspaceId, input as UnassignTagInput);

      case "system:create-tag":
        return await createNewTag(admin, workspaceId, input as CreateTagInput, actorUserId);

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
      phone: input.phone ?? null,
      billing_email: input.billing_email ?? null,
      timezone: input.timezone ?? null,
      address_line_1: input.address_line_1 ?? null,
      address_line_2: input.address_line_2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postal_code: input.postal_code ?? null,
      country: input.country ?? null,
      notes: input.notes ?? null,
      relationship_type: input.relationship_type ?? "unknown",
      relationship_status:
        input.relationship_status ?? relationshipTypeToStatus(input.relationship_type),
      created_via: input.created_via ?? "system_play",
      last_contact_at: input.last_contact_at ?? null,
      first_contact_at: input.first_contact_at ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity(admin, workspaceId, "created", "Person created", input.name, actorUserId, {
    entity_type: "person",
    entity_id: data.id,
    playbook_slug: "memory-records",
  });
  await logAutoHandledMemoryRun(admin, {
    workspaceId,
    entityType: "person",
    entityId: data.id,
    targetType: "person",
    label: input.name,
    title: `Added ${input.name} to People`,
    content: email
      ? `Salt created a People record for ${input.name} using ${email}.`
      : `Salt created a People record for ${input.name}.`,
    confidence: 95,
  });

  registerWatchExpressions({
    workspaceId,
    targetSurface: "people",
    targetEntityId: data.id,
    emails: email ? [email] : undefined,
    phones: input.phone ? [input.phone] : undefined,
  }).catch((err) => {
    console.warn("[system-plays] Watch expression registration failed:", err);
  });

  // Emit entity_learning_extracted to trigger Memory Records playbook field-fill
  dispatchSignalTrigger({
    workspaceId,
    signalKey: "entity_learning_extracted",
    entityId: data.id,
    entitySurface: "person",
    entityLabel: input.name,
    evidence: {
      source: "system_play",
      created_via: input.created_via ?? "system_play",
      has_email: Boolean(email),
      has_phone: Boolean(input.phone),
    },
  }).catch((err) => {
    console.warn("[system-plays] Learning signal dispatch failed:", err);
  });

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
      website: input.website ?? null,
      billing_email: input.billing_email ?? null,
      industry: input.industry ?? null,
      industry_parent: input.industry_parent ?? null,
      industry_child: input.industry_child ?? null,
      estimated_company_size: input.estimated_company_size ?? null,
      estimated_budget_tier: input.estimated_budget_tier ?? null,
      address_line_1: input.address_line_1 ?? null,
      address_line_2: input.address_line_2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postal_code: input.postal_code ?? null,
      country: input.country ?? null,
      last_contact_at: input.last_contact_at ?? null,
      notes: input.notes ?? null,
      created_via: "system_play",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity(admin, workspaceId, "created", "Org created", input.name, actorUserId, {
    entity_type: "organization",
    entity_id: data.id,
    playbook_slug: "memory-records",
  });
  await logAutoHandledMemoryRun(admin, {
    workspaceId,
    entityType: "organization",
    entityId: data.id,
    targetType: "org",
    label: input.name,
    title: `Added ${input.name} to Organizations`,
    content: domain
      ? `Salt created an Organization record for ${input.name} using ${domain}.`
      : `Salt created an Organization record for ${input.name}.`,
    confidence: 95,
  });

  registerWatchExpressions({
    workspaceId,
    targetSurface: "organizations",
    targetEntityId: data.id,
    domains: domain ? [domain] : undefined,
  }).catch((err) => {
    console.warn("[system-plays] Watch expression registration failed:", err);
  });

  // Emit entity_learning_extracted to trigger Memory Records playbook field-fill
  dispatchSignalTrigger({
    workspaceId,
    signalKey: "entity_learning_extracted",
    entityId: data.id,
    entitySurface: "organization",
    entityLabel: input.name,
    evidence: {
      source: "system_play",
      created_via: "system_play",
      has_domain: Boolean(domain),
      has_website: Boolean(input.website),
    },
  }).catch((err) => {
    console.warn("[system-plays] Learning signal dispatch failed:", err);
  });

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
        description: input.description ?? null,
        work_type: input.work_type ?? null,
        status: input.status ?? "active",
        deadline: input.deadline ?? null,
        start_date: input.start_date ?? null,
        contract_value_cents: input.contract_value_cents ?? null,
        base_price_cents: input.base_price_cents ?? null,
        currency: input.currency ?? null,
        hourly_rate_cents: input.hourly_rate_cents ?? null,
        hours_estimate: input.hours_estimate ?? null,
        payment_type: input.payment_type ?? null,
        payment_terms: input.payment_terms ?? null,
        billing_cycle: input.billing_cycle ?? null,
        retainer_mrr_cents: input.retainer_mrr_cents ?? null,
        po_number: input.po_number ?? null,
        is_bundle: input.is_bundle ?? null,
        value_proposition: input.value_proposition ?? null,
        deliverables: input.deliverables ?? null,
        prerequisites: input.prerequisites ?? null,
        differentiators: input.differentiators ?? null,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Auto-create entity_links for connections tab (overview FK + connections tab)
    if (parents.personId) {
      await admin.from("entity_links").upsert(
        {
          workspace_id: workspaceId,
          source_type: "person",
          source_id: parents.personId,
          target_type: "work",
          target_id: data.id,
          relation_type: "related",
          source: "system",
          created_by: actorUserId,
        },
        { onConflict: "workspace_id,source_type,source_id,target_type,target_id" }
      );
    }
    if (parents.organizationId) {
      await admin.from("entity_links").upsert(
        {
          workspace_id: workspaceId,
          source_type: "org",
          source_id: parents.organizationId,
          target_type: "work",
          target_id: data.id,
          relation_type: "related",
          source: "system",
          created_by: actorUserId,
        },
        { onConflict: "workspace_id,source_type,source_id,target_type,target_id" }
      );
    }

    await logActivity(admin, workspaceId, "created", "Work created", input.name, actorUserId, {
      entity_type: "work",
      entity_id: data.id,
      playbook_slug: "memory-records",
    });
    await logAutoHandledMemoryRun(admin, {
      workspaceId,
      entityType: "work",
      entityId: data.id,
      targetType: "work",
      label: input.name,
      title: `Added ${input.name} to Work`,
      content: `Salt created a Work record for ${input.name}.`,
      confidence: 95,
    });

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

function noteTargetToProvenanceType(
  targetType: CreateNoteInput["target_type"],
): "person" | "organization" | "work" | null {
  if (targetType === "space") return null;
  return toDbEntityType(targetType === "org" ? "org" : targetType, "provenance") as
    | "person"
    | "organization"
    | "work";
}

async function createNote(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateNoteInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const entityType = noteTargetToProvenanceType(input.target_type);
  if (!entityType) {
    return {
      success: false,
      error: "Notes can only be attached to people, organizations, or work.",
    };
  }

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
      entity_type: entityType,
      entity_id: input.target_id,
      source: actorUserId ? "ask_salt" : "system",
      source_ref: actorUserId ? `chat:${actorUserId}` : null,
      status: "confirmed",
      note_kind: "general",
      confidence: 100,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    entity_id: data.id,
    entity_type: "note",
    data: { ...data, target_type: input.target_type, target_id: input.target_id },
  };
}

async function addBlocker(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateBlockerInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  await assertEntitiesInWorkspace(admin, workspaceId, [
    { type: "work", id: input.work_id },
  ]);

  const { data, error } = await admin
    .from("work_blockers")
    .insert({
      workspace_id: workspaceId,
      work_id: input.work_id,
      blocker_type: input.blocker_type,
      title: input.title,
      detail: input.detail ?? null,
      source: "user_flagged",
      confidence: 1.0,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity(
    admin,
    workspaceId,
    "created",
    "Blocker added",
    input.title,
    actorUserId
  );

  scheduleWorkHealthRecompute(input.work_id);

  return {
    success: true,
    entity_id: data.id,
    entity_type: "work",
    data: { blocker_id: data.id, work_id: input.work_id },
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
    actorUserId,
    {
      entity_type: "meeting",
      entity_id: data.id,
      playbook_slug: "memory-records",
    }
  );
  await logAutoHandledMemoryRun(admin, {
    workspaceId,
    entityType: "meeting",
    entityId: data.id,
    targetType: "meeting",
    label: input.title,
    title: `Added ${input.title} to Meetings`,
    content: `Salt created a Meeting record for ${input.title}.`,
    confidence: 95,
  });

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
  actorUserId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await admin.from("activity_entries").insert({
    workspace_id: workspaceId,
    action,
    title,
    detail,
    actor_user_id: actorUserId,
    metadata: {
      source: "system_play",
      player_slug: "memory-care",
      auto_executed: true,
      reversible: false,
      ...metadata,
    },
  });

  if (error) {
    console.error("[system-plays] Activity logging failed:", error.message);
  }
}

type AutoHandledMemoryEntityType =
  | "person"
  | "organization"
  | "work"
  | "billing"
  | "file"
  | "meeting"
  | "me";

function sectionForMemoryEntity(entityType: AutoHandledMemoryEntityType): string {
  switch (entityType) {
    case "person":
    case "organization":
      return "relationships";
    case "billing":
      return "billing";
    case "file":
      return "files";
    case "meeting":
      return "meetings";
    case "me":
      return "me";
    case "work":
    default:
      return "work";
  }
}

async function logAutoHandledMemoryRun(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    workspaceId: string;
    entityType: AutoHandledMemoryEntityType;
    entityId: string;
    targetType: string;
    label: string;
    title: string;
    content: string;
    confidence: number;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const section = sectionForMemoryEntity(input.entityType);
  const { error } = await admin.from("play_runs").insert({
    workspace_id: input.workspaceId,
    target_type: input.targetType,
    target_id: input.entityId,
    target_label: input.label,
    recipient_label: input.label,
    state: "approved",
    queue: "auto_handled",
    stakes: "low",
    title: input.title,
    preview: input.content,
    confidence: input.confidence,
    source_context: {
      source: "playbook",
      playbook_slug: "memory-records",
      trigger_signal: "system_play_record_created",
    },
    metadata: {
      playbook_name: "Memory Records",
      player_slug: "memory-care",
      memory_care_profile: true,
      play_card_kind: "profile",
      output_type: "memory_update",
      layer: "learn",
      section,
      profile_entity_type: input.entityType,
      profile_entity_id: input.entityId,
      profile_field: "record",
      profile_value: input.label,
      profile_status: "applied",
      blueprint_slug: "memory-records",
      blueprint_version: 1,
      blueprint_name: "Memory Records",
      memory_applied_at: now,
      because: "System play created a Memory record with high confidence.",
      primary_label: "Saved to Memory",
    },
    approved_at: now,
  });

  if (error) {
    console.error("[system-plays] Auto-handled play-run logging failed:", error.message);
  }
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
      work_id: input.work_id ?? null,
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
    actorUserId,
    {
      entity_type: "meeting",
      entity_id: meeting.id,
      playbook_slug: "memory-records",
    }
  );
  await logAutoHandledMemoryRun(admin, {
    workspaceId,
    entityType: "meeting",
    entityId: meeting.id,
    targetType: "meeting",
    label: input.title,
    title: `Added ${input.title} to Meetings`,
    content: `Salt scheduled a Meeting record for ${input.title}.`,
    confidence: 95,
  });

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

// ============================================================================
// BILLING IMPLEMENTATIONS
// ============================================================================

async function createBilling(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateBillingInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const { data, error } = await admin
    .from("billing_records")
    .insert({
      workspace_id: workspaceId,
      direction: input.direction,
      amount_cents: input.amount_cents,
      currency: input.currency ?? "USD",
      status: input.status ?? "draft",
      category: input.category ?? null,
      vendor_label: input.vendor_label ?? null,
      number: input.number ?? null,
      due_at: input.due_at ?? null,
      issued_at: input.issued_at ?? null,
      paid_at: input.paid_at ?? null,
      person_id: input.person_id ?? null,
      organization_id: input.organization_id ?? null,
      work_id: input.work_id ?? null,
      tags: input.tags ?? [],
      source: "ask_salt",
      origin: "manual",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity(
    admin,
    workspaceId,
    "created",
    `${input.direction === "receivable" ? "Invoice" : "Bill"} created`,
    input.vendor_label ?? `${input.amount_cents / 100} ${input.currency ?? "USD"}`,
    actorUserId,
    {
      entity_type: "billing",
      entity_id: data.id,
      playbook_slug: "memory-records",
    }
  );
  await logAutoHandledMemoryRun(admin, {
    workspaceId,
    entityType: "billing",
    entityId: data.id,
    targetType: "billing",
    label: input.vendor_label ?? `${input.amount_cents / 100} ${input.currency ?? "USD"}`,
    title: `Added ${input.direction === "receivable" ? "invoice" : "bill"} to Billing`,
    content: `Salt created a Billing record.`,
    confidence: 95,
  });

  return {
    success: true,
    entity_id: data.id,
    entity_type: "invoice",
    data,
  };
}

async function updateBilling(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: UpdateBillingInput
): Promise<SystemPlayResult> {
  const { error } = await admin
    .from("billing_records")
    .update({
      ...input.fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.billing_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.billing_id, entity_type: "invoice" };
}

async function archiveBilling(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: ArchiveBillingInput
): Promise<SystemPlayResult> {
  const { error } = await admin
    .from("billing_records")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.billing_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.billing_id, entity_type: "invoice" };
}

// ============================================================================
// FILE RECORD IMPLEMENTATIONS
// ============================================================================

async function createFileRecord(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateFileRecordInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const { data, error } = await admin
    .from("files")
    .insert({
      workspace_id: workspaceId,
      file_name: input.file_name,
      file_type: input.document_type ?? "unknown",
      external_url: input.external_url ?? null,
      category: input.category ?? "other",
      description: input.description ?? null,
      document_type: input.document_type ?? null,
      direction: input.direction ?? null,
      due_date: input.due_date ?? null,
      expiry_date: input.expiry_date ?? null,
      follow_up_date: input.follow_up_date ?? null,
      total_amount_cents: input.total_amount_cents ?? null,
      currency: input.currency ?? null,
      shared_with_client: input.shared_with_client ?? null,
      is_operator_asset: input.is_operator_asset ?? false,
      person_id: input.person_id ?? null,
      organization_id: input.organization_id ?? null,
      uploaded_by: actorUserId ?? "system",
      source_type: "ask_salt",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity(
    admin,
    workspaceId,
    "created",
    "File added",
    input.file_name,
    actorUserId,
    {
      entity_type: "file",
      entity_id: data.id,
      playbook_slug: "memory-records",
    }
  );
  await logAutoHandledMemoryRun(admin, {
    workspaceId,
    entityType: "file",
    entityId: data.id,
    targetType: "file",
    label: input.file_name,
    title: `Added ${input.file_name} to Resources`,
    content: `Salt created a Resource record for ${input.file_name}.`,
    confidence: 95,
  });

  return {
    success: true,
    entity_id: data.id,
    entity_type: "file",
    data,
  };
}

async function updateFileRecord(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: UpdateFileRecordInput
): Promise<SystemPlayResult> {
  const { error } = await admin
    .from("files")
    .update({
      ...input.fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.file_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.file_id, entity_type: "file" };
}

async function archiveFileRecord(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: ArchiveFileRecordInput
): Promise<SystemPlayResult> {
  const { error } = await admin
    .from("files")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.file_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.file_id, entity_type: "file" };
}

// ============================================================================
// ME / OPERATOR FACT IMPLEMENTATIONS
// ============================================================================

async function createMeFact(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateMeFactInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  if (!actorUserId) {
    return { success: false, error: "User ID required to create operator facts" };
  }

  const { data, error } = await admin
    .from("operator_memory_facts")
    .insert({
      workspace_id: workspaceId,
      user_id: actorUserId,
      value: input.value,
      label: input.label ?? null,
      category: input.category ?? "business",
      kind: input.kind ?? "fact",
      scope_type: input.scope_type ?? "global",
      scope_value: input.scope_value ?? null,
      status: input.status ?? "confirmed",
      confidence: input.confidence ?? 100,
      source: "ask_salt",
      provenance: { created_via: "ask_salt" },
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logActivity(
    admin,
    workspaceId,
    "created",
    "Fact about you added",
    input.label ?? input.value.slice(0, 50),
    actorUserId,
    {
      entity_type: "me",
      entity_id: data.id,
      playbook_slug: "memory-records",
    }
  );
  await logAutoHandledMemoryRun(admin, {
    workspaceId,
    entityType: "me",
    entityId: data.id,
    targetType: "me",
    label: input.label ?? input.value.slice(0, 50),
    title: "Added fact to Me",
    content: `Salt saved a fact about you: ${input.label ?? input.value.slice(0, 80)}.`,
    confidence: input.confidence ?? 95,
  });

  return {
    success: true,
    entity_id: data.id,
    entity_type: "note",
    data,
  };
}

async function updateMeFact(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: UpdateMeFactInput
): Promise<SystemPlayResult> {
  const { error } = await admin
    .from("operator_memory_facts")
    .update({
      ...input.fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.fact_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.fact_id, entity_type: "note" };
}

async function archiveMeFact(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: ArchiveMeFactInput
): Promise<SystemPlayResult> {
  const { error } = await admin
    .from("operator_memory_facts")
    .update({
      status: "dismissed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.fact_id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, entity_id: input.fact_id, entity_type: "note" };
}

// ============================================================================
// TAG IMPLEMENTATIONS
// ============================================================================

function normalizeTagSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTagLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

async function findOrCreateTag(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  label: string,
  scope?: string,
  category?: string,
  description?: string
): Promise<{ id: string; label: string } | null> {
  const slug = normalizeTagSlug(label);
  const normalizedLabel = normalizeTagLabel(label);

  if (!slug) return null;

  const { data: existing } = await admin
    .from("workspace_tags")
    .select("id, label, is_archived")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    if (existing.is_archived) {
      await admin
        .from("workspace_tags")
        .update({ is_archived: false })
        .eq("id", existing.id);
    }
    return { id: existing.id, label: existing.label };
  }

  const { data: newTag, error } = await admin
    .from("workspace_tags")
    .insert({
      workspace_id: workspaceId,
      slug,
      label: normalizedLabel,
      scope: scope ?? "all",
      category: category ?? "custom",
      ai_description: description ?? null,
      is_system: false,
      is_archived: false,
      sort_order: 0,
    })
    .select("id, label")
    .single();

  if (error) {
    console.error("[tag] Failed to create tag:", error);
    return null;
  }

  return newTag;
}

async function assignTagToEntity(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: AssignTagInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const tag = await findOrCreateTag(admin, workspaceId, input.tag_label);

  if (!tag) {
    return { success: false, error: "Failed to find or create tag" };
  }

  const { data: existing } = await admin
    .from("entity_tag_assignments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", input.entity_type)
    .eq("entity_id", input.entity_id)
    .eq("tag_id", tag.id)
    .maybeSingle();

  if (existing) {
    return {
      success: true,
      data: { tag_id: tag.id, tag_label: tag.label, action: "already_assigned" },
    };
  }

  const { data, error } = await admin
    .from("entity_tag_assignments")
    .insert({
      workspace_id: workspaceId,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      tag_id: tag.id,
      source: "keeper",
      because: input.because ?? null,
      source_ref: actorUserId ? `ask_salt:${actorUserId}` : null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    entity_id: data.id,
    data: { tag_id: tag.id, tag_label: tag.label, action: "assigned" },
  };
}

async function unassignTagFromEntity(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: UnassignTagInput
): Promise<SystemPlayResult> {
  const slug = normalizeTagSlug(input.tag_label);

  const { data: tag } = await admin
    .from("workspace_tags")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle();

  if (!tag) {
    return { success: false, error: "Tag not found" };
  }

  const { error } = await admin
    .from("entity_tag_assignments")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("entity_type", input.entity_type)
    .eq("entity_id", input.entity_id)
    .eq("tag_id", tag.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function createNewTag(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  input: CreateTagInput,
  actorUserId?: string
): Promise<SystemPlayResult> {
  const tag = await findOrCreateTag(
    admin,
    workspaceId,
    input.label,
    input.scope,
    input.category,
    input.description
  );

  if (!tag) {
    return { success: false, error: "Failed to create tag" };
  }

  await logActivity(
    admin,
    workspaceId,
    "created",
    "Tag created",
    tag.label,
    actorUserId
  );

  return {
    success: true,
    entity_id: tag.id,
    data: { tag_id: tag.id, tag_label: tag.label },
  };
}
