import "server-only";

/**
 * Re-Enrichment Bridge (Captures V2 Phase 3.7).
 *
 * Bridges watch expression matches to the enrichment pipeline:
 * 1. Check if re-enrichment is needed (24h throttle via last_matched_at)
 * 2. Fetch entity details to build enrichment seed
 * 3. Call enrichEntity() to pull latest data from connected apps
 * 4. Call applyEnrichmentToEntity() to update Memory fields
 *
 * This ensures entities stay "aware" of new information from connected apps.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { enrichEntity } from "@/app/_lib/composio/enrichment";
import { applyEnrichmentToEntity } from "@/app/_lib/composio/enrichment/apply";
import type { EnrichableEntityType, EnrichmentSeed } from "@/app/_lib/composio/enrichment/types";
import { shouldReenrich, updateWatchMatchTimestamp } from "./watch-expressions";
import type { WatchMatch } from "./watch-expressions";

export interface ReenrichmentResult {
  triggered: boolean;
  entityId: string;
  entityType: EnrichableEntityType;
  reason: string;
  fieldsApplied?: number;
  fieldsAccumulated?: number;
}

const REENRICH_THROTTLE_HOURS = 24;

/**
 * Trigger re-enrichment for an entity based on a watch expression match.
 *
 * Throttled to max 1 re-enrichment per entity per 24h.
 */
export async function triggerReenrichment(
  workspaceId: string,
  match: WatchMatch
): Promise<ReenrichmentResult> {
  const { expression } = match;
  const entityType = surfaceToEntityType(expression.targetSurface);

  const needsReenrich = await shouldReenrich(expression.id, REENRICH_THROTTLE_HOURS);
  if (!needsReenrich) {
    return {
      triggered: false,
      entityId: expression.targetEntityId,
      entityType,
      reason: `Throttled: last enriched within ${REENRICH_THROTTLE_HOURS}h`,
    };
  }

  const seed = await buildSeedForEntity(
    workspaceId,
    expression.targetSurface,
    expression.targetEntityId
  );

  if (!seed) {
    return {
      triggered: false,
      entityId: expression.targetEntityId,
      entityType,
      reason: "Entity not found or no seed data available",
    };
  }

  const enrichmentResult = await enrichEntity({
    entityType,
    seed,
    workspaceId,
  });

  if (enrichmentResult.sourcesWithData.length === 0) {
    await updateWatchMatchTimestamp(expression.id);
    return {
      triggered: true,
      entityId: expression.targetEntityId,
      entityType,
      reason: "Enrichment ran but no new data found",
      fieldsApplied: 0,
      fieldsAccumulated: 0,
    };
  }

  const entityLabel = seed.name ?? seed.email ?? expression.expressionValue;
  const applyResult = await applyEnrichmentToEntity({
    workspaceId,
    entityType,
    entityId: expression.targetEntityId,
    entityLabel,
    enrichmentResult,
  });

  await updateWatchMatchTimestamp(expression.id);

  return {
    triggered: true,
    entityId: expression.targetEntityId,
    entityType,
    reason: applyResult.summary,
    fieldsApplied: applyResult.appliedFields.length,
    fieldsAccumulated: applyResult.accumulatedFields.length,
  };
}

/**
 * Queue re-enrichment for later processing (non-blocking).
 *
 * Call this from the gate pipeline to avoid slowing down ingest.
 */
export function queueReenrichment(
  workspaceId: string,
  match: WatchMatch
): void {
  triggerReenrichment(workspaceId, match).catch((err) => {
    console.warn(
      "[reenrichment-bridge] Failed to re-enrich:",
      match.expression.targetSurface,
      match.expression.targetEntityId,
      err instanceof Error ? err.message : err
    );
  });
}

function surfaceToEntityType(surface: "people" | "organizations"): EnrichableEntityType {
  return surface === "people" ? "person" : "org";
}

async function buildSeedForEntity(
  workspaceId: string,
  surface: "people" | "organizations",
  entityId: string
): Promise<EnrichmentSeed | null> {
  const admin = createAdminClient();

  if (surface === "people") {
    const { data: person } = await admin
      .from("people")
      .select("id, name, email, phone, billing_email")
      .eq("id", entityId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!person) return null;

    return {
      name: person.name ?? undefined,
      email: person.email ?? person.billing_email ?? undefined,
      phone: person.phone ?? undefined,
    };
  }

  if (surface === "organizations") {
    const { data: org } = await admin
      .from("organizations")
      .select("id, name, domain, billing_email")
      .eq("id", entityId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!org) return null;

    return {
      name: org.name ?? undefined,
      domain: org.domain ?? undefined,
      email: org.billing_email ?? undefined,
    };
  }

  return null;
}
