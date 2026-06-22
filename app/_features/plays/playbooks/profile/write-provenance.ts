import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { scheduleRelationshipHealthRecompute } from "@/app/_features/people/health/recompute";
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
  personId: string;
  results: ProfileFieldResult[];
  blueprintSlug: string;
  blueprintVersion: number;
}): Promise<void> {
  const admin = createAdminClient();

  for (const result of input.results) {
    await writeProfileFieldProvenance({
      workspaceId: input.workspaceId,
      entityType: "person",
      entityId: input.personId,
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

    if (result.field === "relationship_type") {
      await admin
        .from("people")
        .update({ relationship_type: result.value })
        .eq("id", input.personId)
        .eq("studio_id", input.workspaceId);
      scheduleRelationshipHealthRecompute(input.personId);
    }

    if (result.field === "title") {
      await admin
        .from("people")
        .update({ title: result.value })
        .eq("id", input.personId)
        .eq("studio_id", input.workspaceId);
    }
  }
}
