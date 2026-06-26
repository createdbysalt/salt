import "server-only";

import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { gatherHealthSignals } from "./gather-signals";
import { scoreRelationshipHealth } from "./relationship-health";
import type { RelationshipHealthResult } from "./types";

function logRecomputeError(context: string, error: unknown): void {
  console.error(`[relationship-health] ${context}:`, error);
}

export async function recomputeRelationshipHealth(
  personId: string,
): Promise<RelationshipHealthResult | null> {
  const admin = createAdminClient();

  const { data: person, error: personError } = await admin
    .from("people")
    .select(
      "id, workspace_id, relationship_type, relationship_status, migrated_from_client_id",
    )
    .eq("id", personId)
    .is("deleted_at", null)
    .maybeSingle();

  if (personError || !person) {
    logRecomputeError("person lookup failed", personError);
    return null;
  }

  const signals = await gatherHealthSignals({
    supabase: admin,
    personId,
    migratedClientId: (person.migrated_from_client_id as string | null) ?? null,
  });

  const result = scoreRelationshipHealth({
    context: {
      relationshipType: (person.relationship_type as RelationshipType | null) ?? null,
      relationshipStatus: (person.relationship_status as string | null) ?? null,
    },
    signals,
  });

  const { error: updateError } = await admin
    .from("people")
    .update({
      relationship_health_score: result.score,
      relationship_health_band: result.band,
      relationship_health_archetype: result.archetype,
      relationship_health_factors: result.factors,
      relationship_health_version: result.version,
      relationship_health_updated_at: new Date().toISOString(),
    })
    .eq("id", personId);

  if (updateError) {
    logRecomputeError("cache write failed", updateError);
  }

  return result;
}

export function scheduleRelationshipHealthRecompute(personId: string): void {
  void recomputeRelationshipHealth(personId).catch((error) => {
    logRecomputeError(`scheduled recompute failed for ${personId}`, error);
  });
}

export async function recomputeRelationshipHealthForClient(clientId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: people, error } = await admin
    .from("people")
    .select("id")
    .eq("migrated_from_client_id", clientId)
    .is("deleted_at", null);

  if (error) {
    logRecomputeError("client person lookup failed", error);
    return;
  }

  for (const person of people ?? []) {
    scheduleRelationshipHealthRecompute(person.id as string);
  }
}
