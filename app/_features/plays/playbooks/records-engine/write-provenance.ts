import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { toLearningDbEntityType, type EvidenceType } from "@/app/_lib/learning";
import { scheduleOrgHealthRecompute } from "@/app/_features/orgs/health/recompute";
import { scheduleRelationshipHealthRecompute } from "@/app/_features/people/health/recompute";
import { scheduleWorkHealthRecompute } from "@/app/_features/work/health/recompute";
import { processCareProposal } from "@/app/_features/memory/care/decision-pipeline";
import type {
  ProfileEntityType,
  ProfileFieldKey,
  ProfileFieldResult,
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "./types";

/**
 * Write-path orchestration for records-engine field results.
 *
 * Every proposed mutation routes through the Memory Care decision pipeline
 * (tiered confidence bars). There is no approval queue: proposals either
 * apply (recorded as Handled with full provenance + salt_learning) or park
 * in Watching (entity_evidence, visible in Memory → Filter). Never-touch
 * fields are refused outright.
 */

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
  const dbEntityType =
    input.entityType === "resource"
      ? toLearningDbEntityType("resource")
      : input.entityType;
  const row = {
    workspace_id: input.workspaceId,
    entity_type: dbEntityType,
    entity_id: input.entityId,
    field: input.field,
    value: { text: input.value },
    source: input.source,
    rule_id: input.ruleId,
    confidence: input.confidence,
    // Boundary cast into the Json column; evidence arrives as
    // Record<string, unknown> from ProfileFieldResult.
    evidence: input.evidence as Json,
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

  console.error("writeProfileFieldProvenance insert failed:", error);
  return null;
}

function inferEvidenceType(source: string): EvidenceType {
  if (source === "rule") return "llm_inference";
  if (source === "email") return "email_match";
  return "behavioral_signal";
}

export async function applyProfileFieldResults(input: {
  workspaceId: string;
  entityType?: ProfileEntityType;
  entityId?: string;
  personId?: string;
  results: ProfileFieldResult[];
  blueprintSlug: string;
  blueprintVersion: number;
  /** Source tracking for evidence accumulation. */
  sourceType?: string;
  sourceCaptureId?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const entityType = input.entityType ?? "person";
  const entityId = input.entityId ?? input.personId;

  if (!entityId) {
    throw new Error("applyProfileFieldResults requires entityId or personId");
  }

  const targetLabel = await resolveProfileTargetLabel(entityType, entityId);

  for (const result of input.results) {
    if (!result.value) {
      // Nothing proposed — record provenance only when the caller marked it
      // applied (e.g. field clears are not supported; skip empty results).
      continue;
    }

    const currentValue = await getCurrentFieldValue(admin, entityType, entityId, result.field);

    const decision = await processCareProposal({
      workspaceId: input.workspaceId,
      capability: "records",
      entityType,
      entityId,
      entityLabel: targetLabel ?? "this record",
      field: result.field,
      proposedValue: result.value,
      currentValue,
      confidence: result.confidence ?? 0,
      because: result.because ?? "",
      ruleId: result.ruleId ?? undefined,
      evidenceType: inferEvidenceType(result.source),
      evidenceDetails: result.evidence,
      sourceType: input.sourceType ?? "unknown",
      sourceCaptureId: input.sourceCaptureId,
    });

    // No-op: the field already holds this value — skip the provenance row
    // and the entity write so repeat care runs leave no trace.
    if (decision.noop) continue;

    const provenanceStatus: ProfileProvenanceStatus =
      decision.action === "apply" ? "applied" : "pending";
    await writeProfileFieldProvenance({
      workspaceId: input.workspaceId,
      entityType,
      entityId,
      field: result.field,
      value: result.value,
      source: result.source,
      ruleId: result.ruleId,
      confidence: decision.aggregatedConfidence || result.confidence,
      evidence: {
        ...result.evidence,
        because: result.because,
        careDecision: decision.action,
        careTier: decision.tier,
        careBar: decision.bar,
        evidenceId: decision.evidenceId,
        learningId: decision.learningId,
      },
      blueprintSlug: input.blueprintSlug,
      blueprintVersion: input.blueprintVersion,
      status: provenanceStatus,
    });

    if (decision.action !== "apply") continue;

    await applyEntityFieldUpdate(
      admin,
      input.workspaceId,
      entityType,
      entityId,
      result.field,
      result.value,
    );
  }
}

/**
 * Get the current value of a field from the entity table.
 * Used for first-time classification detection in the care pipeline.
 */
async function getCurrentFieldValue(
  admin: ReturnType<typeof createAdminClient>,
  entityType: ProfileEntityType,
  entityId: string,
  field: string,
): Promise<unknown> {
  if (entityType === "person") {
    // No company_name mapping: people has no company column — org linkage
    // lives in organization_people.
    const fieldMap: Record<string, string> = {
      relationship_type: "relationship_type",
      title: "title",
      record_status: "relationship_type", // Maps to same column
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
 * Apply an approved field update to the entity table. Only called after the
 * care pipeline returns "apply".
 */
async function applyEntityFieldUpdate(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  entityType: ProfileEntityType,
  entityId: string,
  field: string,
  value: string,
): Promise<void> {
  if (entityType === "person") {
    if (field === "relationship_type") {
      await admin
        .from("people")
        .update({ relationship_type: value })
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      scheduleRelationshipHealthRecompute(entityId);
      return;
    }

    if (field === "title") {
      await admin
        .from("people")
        .update({ title: value })
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      return;
    }

    // No company_name branch: people has no company column (the field is not
    // in PersonProfileFieldKey either) — the old update could never persist.
  }

  if (entityType === "organization") {
    if (field === "website" || field === "industry" || field === "relationship_status") {
      // Assignment through the narrowed key union keeps the patch typed to
      // real columns (a computed key would widen to a string index signature).
      const orgPatch: Partial<
        Record<"website" | "industry" | "relationship_status", string>
      > = {};
      orgPatch[field] = value;
      await admin
        .from("organizations")
        .update({ ...orgPatch, updated_at: new Date().toISOString() })
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      if (field === "relationship_status") scheduleOrgHealthRecompute(entityId);
      return;
    }

    if (field === "key_contact") {
      await admin
        .from("organization_people")
        .update({ is_primary: false })
        .eq("organization_id", entityId)
        .eq("is_primary", true);

      await admin.from("organization_people").upsert(
        {
          organization_id: entityId,
          person_id: value,
          is_primary: true,
        },
        { onConflict: "organization_id,person_id" },
      );
      scheduleOrgHealthRecompute(entityId);
      return;
    }
  }

  if (entityType === "work") {
    const projectPatch: Record<string, string> = {};
    if (field === "status") projectPatch.status = value;
    if (field === "description") projectPatch.description = value;
    if (field === "deadline") projectPatch.deadline = value;
    if (field === "start_date") projectPatch.start_date = value;

    if (Object.keys(projectPatch).length > 0) {
      await admin
        .from("work")
        .update({ ...projectPatch, updated_at: new Date().toISOString() })
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      scheduleWorkHealthRecompute(entityId);
    }
  }
}

// Retired 2026-08-08 (founder call): the `_relationship_question` one-tap
// Watching item is gone. Its UI was never built, it rendered as a JSON blob,
// and a question at confidence 0 violates the Watching contract (concrete
// proposals only). Relationship stays unclassified until evidence arrives.
