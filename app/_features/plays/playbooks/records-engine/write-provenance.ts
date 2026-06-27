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
      .from("projects")
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
  const { data } = await admin.from("profile_field_provenance").insert({
    workspace_id: input.workspaceId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    field: input.field,
    value: { text: input.value },
    source: input.source,
    rule_id: input.ruleId,
    confidence: input.confidence,
    evidence: input.evidence,
    blueprint_slug: input.blueprintSlug,
    blueprint_version: input.blueprintVersion,
    status: input.status,
  }).select("id").single();

  return (data?.id as string | undefined) ?? null;
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
          .from("projects")
          .update({ ...projectPatch, updated_at: new Date().toISOString() })
          .eq("id", entityId)
          .eq("workspace_id", input.workspaceId);
        scheduleWorkHealthRecompute(entityId);
      }
    }
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
