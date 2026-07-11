import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { scheduleOrgHealthRecompute } from "@/app/_features/orgs/health/recompute";
import { scheduleRelationshipHealthRecompute } from "@/app/_features/people/health/recompute";
import { scheduleWorkHealthRecompute } from "@/app/_features/work/health/recompute";
import type {
  PersonProfileFieldKey,
  ProfileEntityType,
  ProfileFieldKey,
  ProfileFieldResult,
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "./types";
import {
  buildKeeperProfileFindingPayload,
  buildRelationshipQuestionFindingPayload,
} from "./keeper-profile-findings";
import {
  createKeeperProfilePlayRun,
  createKeeperQuestionPlayRun,
} from "@/app/_features/plays/services/create-keeper-play-run";
import {
  gateProfileFieldMutation,
  shouldBypassConfidenceGate,
} from "./confidence-gate";

async function resolveProfileTargetLabel(
  entityType: ProfileEntityType,
  entityId: string,
): Promise<string | null> {
  const admin = createAdminClient();

  if (entityType === "person") {
    const { data } = await admin
      .from("people")
      .select("name, email")
      .eq("id", entityId)
      .maybeSingle();
    return data?.name?.trim() || data?.email?.trim() || null;
  }

  if (entityType === "organization") {
    const { data } = await admin
      .from("organizations")
      .select("name")
      .eq("id", entityId)
      .maybeSingle();
    return data?.name?.trim() || null;
  }

  if (entityType === "work") {
    const { data } = await admin
      .from("work")
      .select("name")
      .eq("id", entityId)
      .maybeSingle();
    return data?.name?.trim() || null;
  }

  return null;
}

export async function writeProfileFieldProvenance(input: {
  workspaceId: string;
  entityType: ProfileEntityType;
  entityId: string;
  field: ProfileFieldKey;
  value: string | null;
  source: ProfileProvenanceSource;
  ruleId: string | null;
  confidence: number | null;
  evidence: Record<string, unknown>;
  blueprintSlug: string;
  blueprintVersion: number;
  status: ProfileProvenanceStatus;
}): Promise<string | null> {
  const admin = createAdminClient();
  const row = {
    workspace_id: input.workspaceId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    field: input.field,
    value: { text: input.value },
    source: input.source,
    rule_id: input.ruleId,
    confidence: input.confidence,
    evidence: input.evidence,
    blueprint_slug: input.blueprintSlug as string | null,
    blueprint_version: input.blueprintVersion,
    status: input.status,
  };

  const { data, error } = await admin
    .from("profile_field_provenance")
    .insert(row)
    .select("id")
    .single();

  if (!error) {
    return (data?.id as string | undefined) ?? null;
  }

  // blueprint_slug is provenance metadata with an FK to playbook_blueprints
  // (ON DELETE SET NULL). On environments where the blueprint seeds haven't
  // run, the FK violation must not silently drop the Activity entry — retry
  // without the slug so the provenance row (and its timeline entry) survives.
  if (
    error.code === "23503" &&
    error.message.includes("profile_field_provenance_blueprint_slug_fkey")
  ) {
    console.error(
      `writeProfileFieldProvenance: blueprint "${input.blueprintSlug}" missing from playbook_blueprints; retrying without slug`,
    );
    const retry = await admin
      .from("profile_field_provenance")
      .insert({ ...row, blueprint_slug: null })
      .select("id")
      .single();
    if (retry.error) {
      console.error("writeProfileFieldProvenance retry failed:", retry.error);
      return null;
    }
    return (retry.data?.id as string | undefined) ?? null;
  }

  console.error("writeProfileFieldProvenance insert failed:", error);
  return null;
}

export async function applyProfileFieldResults(input: {
  workspaceId: string;
  entityType?: ProfileEntityType;
  entityId?: string;
  personId?: string;
  results: ProfileFieldResult[];
  blueprintSlug: string;
  blueprintVersion: number;
  /**
   * When true, Salt has a real person but couldn't classify the relationship.
   * Emit a one-tap question play instead of guessing — never gate saving.
   */
  relationshipUnknown?: boolean;
  /**
   * Source tracking for confidence-gated execution.
   * Required for evidence accumulation.
   */
  sourceType?: string;
  sourceCaptureId?: string;
  /**
   * When true, use confidence-gated execution for keeper mutations.
   * Defaults to false for backwards compatibility.
   */
  useConfidenceGate?: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  const entityType = input.entityType ?? "person";
  const entityId = input.entityId ?? input.personId;

  if (!entityId) {
    throw new Error("applyProfileFieldResults requires entityId or personId");
  }

  const targetLabel = await resolveProfileTargetLabel(entityType, entityId);

  if (input.relationshipUnknown && entityType === "person") {
    await maybeEmitRelationshipQuestion({
      admin,
      workspaceId: input.workspaceId,
      personId: entityId,
      targetLabel,
      blueprintSlug: input.blueprintSlug,
      blueprintVersion: input.blueprintVersion,
      results: input.results,
    });
  }

  for (const result of input.results) {
    // ============================================================================
    // Confidence-Gated Execution Path (Phase 3)
    // ============================================================================
    // When enabled, routes mutations through evidence accumulation + threshold check.
    // Three paths: auto_execute (high confidence), accumulate (wait), approval_required (queue).
    if (
      input.useConfidenceGate &&
      entityType === "person" &&
      result.value &&
      !shouldBypassConfidenceGate(entityType, result.field)
    ) {
      // Get current value for first-time detection
      const currentValue = await getCurrentFieldValue(admin, entityType, entityId, result.field);

      const gateOutput = await gateProfileFieldMutation({
        workspaceId: input.workspaceId,
        entityType,
        entityId,
        entityLabel: targetLabel ?? "this contact",
        field: result.field,
        proposedValue: result.value,
        currentValue,
        result,
        sourceType: input.sourceType ?? "unknown",
        sourceCaptureId: input.sourceCaptureId,
        playbookSlug: input.blueprintSlug,
      });

      // Write provenance regardless of path (for audit trail)
      const provenanceStatus: ProfileProvenanceStatus =
        gateOutput.path === "auto_execute" ? "applied" : "pending";
      await writeProfileFieldProvenance({
        workspaceId: input.workspaceId,
        entityType,
        entityId,
        field: result.field,
        value: result.value,
        source: result.source,
        ruleId: result.ruleId,
        confidence: gateOutput.aggregatedConfidence,
        evidence: {
          ...result.evidence,
          because: result.because,
          gatePath: gateOutput.path,
          evidenceId: gateOutput.evidenceId,
          learningId: gateOutput.learningId,
        },
        blueprintSlug: input.blueprintSlug,
        blueprintVersion: input.blueprintVersion,
        status: provenanceStatus,
      });

      if (gateOutput.path === "auto_execute") {
        // High confidence + low stakes: apply immediately
        // Learning already recorded in gateProfileFieldMutation
        await applyPersonFieldUpdate(admin, input.workspaceId, entityId, result.field, result.value);

        // Create auto-handled play run for audit trail
        await createKeeperProfilePlayRun({
          workspaceId: input.workspaceId,
          personId: entityId,
          personName: targetLabel ?? "this contact",
          field: result.field as PersonProfileFieldKey,
          proposedValue: result.value,
          because: result.because ?? null,
          confidence: gateOutput.aggregatedConfidence,
          sourceUrl: null,
          triggerLabel: "From email",
          autoHandle: true,
        });
      } else if (gateOutput.path === "approval_required") {
        // High stakes: queue for approval
        await createKeeperProfilePlayRun({
          workspaceId: input.workspaceId,
          personId: entityId,
          personName: targetLabel ?? "this contact",
          field: result.field as PersonProfileFieldKey,
          proposedValue: result.value,
          because: result.because ?? null,
          confidence: gateOutput.aggregatedConfidence,
          sourceUrl: null,
          triggerLabel: "From email",
          autoHandle: false,
        });
      }
      // gateOutput.path === "accumulate": skip — evidence stored, waiting for more signal

      continue; // Skip the legacy flow
    }

    // ============================================================================
    // Legacy Execution Path (Phase 2)
    // ============================================================================
    // Used when confidence gate is disabled or for non-person entities.
    const provenanceId = await writeProfileFieldProvenance({
      workspaceId: input.workspaceId,
      entityType,
      entityId,
      field: result.field,
      value: result.value,
      source: result.source,
      ruleId: result.ruleId,
      confidence: result.confidence,
      evidence: { ...result.evidence, because: result.because },
      blueprintSlug: input.blueprintSlug,
      blueprintVersion: input.blueprintVersion,
      status: result.status,
    });

    // Phase 2: Route person profile findings to play_runs instead of intelligence_findings
    if (entityType === "person" && result.status === "pending" && result.value) {
      await createKeeperProfilePlayRun({
        workspaceId: input.workspaceId,
        personId: entityId,
        personName: targetLabel ?? "this contact",
        field: result.field as PersonProfileFieldKey,
        proposedValue: result.value,
        because: result.because ?? null,
        confidence: result.confidence,
        sourceUrl: null, // TODO: pass through from evidence when available
        triggerLabel: "From email",
        autoHandle: false,
      });
    } else if (entityType === "person" && result.status === "applied" && result.value) {
      // Auto-handled: still create a play_run for the audit trail
      await createKeeperProfilePlayRun({
        workspaceId: input.workspaceId,
        personId: entityId,
        personName: targetLabel ?? "this contact",
        field: result.field as PersonProfileFieldKey,
        proposedValue: result.value,
        because: result.because ?? null,
        confidence: result.confidence,
        sourceUrl: null,
        triggerLabel: "From email",
        autoHandle: true,
      });
    } else {
      // Non-person entities still use findings (until Phase 3 migration)
      const findingPayload = buildKeeperProfileFindingPayload({
        workspaceId: input.workspaceId,
        entityType,
        entityId,
        field: result.field,
        result,
        blueprintSlug: input.blueprintSlug,
        blueprintVersion: input.blueprintVersion,
        provenanceId,
        targetLabel,
      });

      if (findingPayload) {
        await admin.from("intelligence_findings").insert(findingPayload);
      }
    }

    if (result.status !== "applied" || !result.value) continue;

    if (entityType === "person" && result.field === "relationship_type") {
      await admin
        .from("people")
        .update({ relationship_type: result.value })
        .eq("id", entityId)
        .eq("workspace_id", input.workspaceId);
      scheduleRelationshipHealthRecompute(entityId);
    }

    if (entityType === "person" && result.field === "title") {
      await admin
        .from("people")
        .update({ title: result.value })
        .eq("id", entityId)
        .eq("workspace_id", input.workspaceId);
    }

    if (entityType === "organization" && result.field === "website") {
      await admin
        .from("organizations")
        .update({ website: result.value, updated_at: new Date().toISOString() })
        .eq("id", entityId)
        .eq("workspace_id", input.workspaceId);
    }

    if (entityType === "organization" && result.field === "industry") {
      await admin
        .from("organizations")
        .update({ industry: result.value, updated_at: new Date().toISOString() })
        .eq("id", entityId)
        .eq("workspace_id", input.workspaceId);
    }

    if (entityType === "organization" && result.field === "relationship_status") {
      await admin
        .from("organizations")
        .update({ relationship_status: result.value, updated_at: new Date().toISOString() })
        .eq("id", entityId)
        .eq("workspace_id", input.workspaceId);
      scheduleOrgHealthRecompute(entityId);
    }

    if (entityType === "organization" && result.field === "key_contact") {
      await admin
        .from("organization_people")
        .update({ is_primary: false })
        .eq("organization_id", entityId)
        .eq("is_primary", true);

      await admin.from("organization_people").upsert(
        {
          organization_id: entityId,
          person_id: result.value,
          is_primary: true,
        },
        { onConflict: "organization_id,person_id" },
      );
      scheduleOrgHealthRecompute(entityId);
    }

    if (entityType === "work") {
      const projectPatch: Record<string, string> = {};
      if (result.field === "status") projectPatch.status = result.value;
      if (result.field === "description") projectPatch.description = result.value;
      if (result.field === "deadline") projectPatch.deadline = result.value;
      if (result.field === "start_date") projectPatch.start_date = result.value;

      if (Object.keys(projectPatch).length > 0) {
        await admin
          .from("work")
          .update({ ...projectPatch, updated_at: new Date().toISOString() })
          .eq("id", entityId)
          .eq("workspace_id", input.workspaceId);
        scheduleWorkHealthRecompute(entityId);
      }
    }
  }
}

/**
 * Get the current value of a field from the entity table.
 * Used for first-time classification detection in confidence gate.
 */
async function getCurrentFieldValue(
  admin: ReturnType<typeof createAdminClient>,
  entityType: ProfileEntityType,
  entityId: string,
  field: string,
): Promise<unknown> {
  if (entityType === "person") {
    const fieldMap: Record<string, string> = {
      relationship_type: "relationship_type",
      title: "title",
      record_status: "relationship_type", // Maps to same column
      company_name: "company",
      email: "email",
      phone: "phone",
    };
    const dbColumn = fieldMap[field];
    if (!dbColumn) return null;

    const { data } = await admin
      .from("people")
      .select(dbColumn)
      .eq("id", entityId)
      .maybeSingle();
    return data?.[dbColumn as keyof typeof data] ?? null;
  }

  if (entityType === "organization") {
    const fieldMap: Record<string, string> = {
      industry: "industry",
      relationship_status: "relationship_status",
      website: "website",
      key_contact: "primary_contact_id",
    };
    const dbColumn = fieldMap[field];
    if (!dbColumn) return null;

    const { data } = await admin
      .from("organizations")
      .select(dbColumn)
      .eq("id", entityId)
      .maybeSingle();
    return data?.[dbColumn as keyof typeof data] ?? null;
  }

  return null;
}

/**
 * Apply a field update to a person entity.
 * Extracted from the main update logic for use by confidence gate.
 */
async function applyPersonFieldUpdate(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  personId: string,
  field: string,
  value: string,
): Promise<void> {
  if (field === "relationship_type") {
    await admin
      .from("people")
      .update({ relationship_type: value })
      .eq("id", personId)
      .eq("workspace_id", workspaceId);
    scheduleRelationshipHealthRecompute(personId);
    return;
  }

  if (field === "title") {
    await admin
      .from("people")
      .update({ title: value })
      .eq("id", personId)
      .eq("workspace_id", workspaceId);
    return;
  }

  if (field === "company_name") {
    await admin
      .from("people")
      .update({ company: value })
      .eq("id", personId)
      .eq("workspace_id", workspaceId);
    return;
  }
}

async function maybeEmitRelationshipQuestion(input: {
  admin: ReturnType<typeof createAdminClient>;
  workspaceId: string;
  personId: string;
  targetLabel: string | null;
  blueprintSlug: string;
  blueprintVersion: number;
  results: ProfileFieldResult[];
}): Promise<void> {
  // If Salt did land a relationship value (applied or pending), there is
  // nothing to ask — the profile/auto-handled play covers it.
  const hasRelationshipResult = input.results.some(
    (result) => result.field === "relationship_type" && result.value?.trim(),
  );
  if (hasRelationshipResult) return;

  // Dedupe: don't stack question plays for the same person + field.
  // Check both play_runs (Phase 2) and intelligence_findings (legacy).
  const { data: existingPlayRun } = await input.admin
    .from("play_runs")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("target_id", input.personId)
    .eq("state", "queued")
    .contains("metadata", { keeper_question: true, question_field: "relationship_type" })
    .limit(1)
    .maybeSingle();

  if (existingPlayRun?.id) return;

  // Also check legacy findings (will be removed after full migration)
  const { data: existingFinding } = await input.admin
    .from("intelligence_findings")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("person_id", input.personId)
    .eq("state", "needs_you")
    .contains("evidence", {
      metadata: { keeper_question: true, question_field: "relationship_type" },
    })
    .limit(1)
    .maybeSingle();

  if (existingFinding?.id) return;

  // Phase 2: Create question play_run instead of finding
  const target = input.targetLabel?.trim() || "this contact";
  await createKeeperQuestionPlayRun({
    workspaceId: input.workspaceId,
    personId: input.personId,
    personName: target,
    field: "relationship_type",
    prompt: `How do you know ${target}?`,
    options: [
      { value: "client", label: "Client" },
      { value: "prospect", label: "Prospect" },
      { value: "partner", label: "Partner" },
      { value: "vendor", label: "Vendor" },
    ],
    sourceUrl: null,
    triggerLabel: "From email",
  });
}
