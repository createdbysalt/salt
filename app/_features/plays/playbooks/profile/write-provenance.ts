import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { scheduleOrgHealthRecompute } from "@/app/_features/orgs/health/recompute";
import { scheduleRelationshipHealthRecompute } from "@/app/_features/people/health/recompute";
import { scheduleWorkHealthRecompute } from "@/app/_features/work/health/recompute";
import type {
  ProfileEntityType,
  ProfileFieldKey,
  ProfileFieldResult,
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "./types";

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
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("profile_field_provenance").insert({
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
  });
}

export async function applyProfileFieldResults(input: {
  workspaceId: string;
  entityType?: ProfileEntityType;
  entityId?: string;
  personId?: string;
  results: ProfileFieldResult[];
  blueprintSlug: string;
  blueprintVersion: number;
}): Promise<void> {
  const admin = createAdminClient();
  const entityType = input.entityType ?? "person";
  const entityId = input.entityId ?? input.personId;

  if (!entityId) {
    throw new Error("applyProfileFieldResults requires entityId or personId");
  }

  for (const result of input.results) {
    await writeProfileFieldProvenance({
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
      if (result.field === "project_type") projectPatch.project_type = result.value;
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
