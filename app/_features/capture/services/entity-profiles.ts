import "server-only";

/**
 * Entity Profiles (Connector Rules & Learning, Phase 6).
 *
 * Category-dispatch learned reputation — the generalization of email's
 * capture_sender_profiles loop to every capture category:
 *
 * - Email sender entities delegate to capture_sender_profiles (proven table;
 *   reply-rate columns no other category has; existing writers stay).
 * - Every other category reads/writes connector_entity_profiles.
 *
 * Keys ALWAYS come from the P2 adapter extraction (feedbackEntity) — this
 * service never re-derives them. Key normalization matches rules-manager so a
 * rule and a profile for "Maya@Example.com" resolve to the same row.
 *
 * Readers: the admission gate (esteemed-entity signal). Writers: user
 * corrections (P4) and admission outcomes — cheap implicit signals, no new
 * vendor spend, no per-event writes.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";
import type { FeedbackEntity } from "../adapters/types";
import { normalizeRuleEntityKey } from "./rules-manager";

export interface EntityReputation {
  /** 0-100 learned reputation; 50 is the no-history baseline. */
  score: number;
  observations: number;
}

export interface EntityProfileRef {
  /** Capture-layer provider (envelope.sourceType); null = workspace-wide. */
  provider: string | null;
  category: ConnectorCategory;
  entity: FeedbackEntity;
}

/**
 * Email sender entities keep their proven home. Every other entity type —
 * including email's domain/pattern vocabulary — lives in the generalized
 * table.
 */
function isEmailSenderEntity(ref: EntityProfileRef): boolean {
  return ref.category === "email" && ref.entity.type === "sender_email";
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

async function loadEmailSenderReputation(
  workspaceId: string,
  key: string,
): Promise<EntityReputation | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("capture_sender_profiles")
    .select("reputation_score, capture_count")
    .eq("workspace_id", workspaceId)
    .eq("sender_key", key)
    .eq("sender_key_type", "email")
    .maybeSingle();

  if (!data) return null;
  return {
    score: (data.reputation_score as number | null) ?? 50,
    observations: 0,
  };
}

/**
 * Load learned reputation for an entity, or null when the workspace has no
 * history with it (callers treat that as first contact).
 */
export async function loadEntityReputation(
  workspaceId: string,
  ref: EntityProfileRef,
): Promise<EntityReputation | null> {
  const key = normalizeRuleEntityKey(ref.entity.type, ref.entity.key);
  if (!key) return null;

  if (isEmailSenderEntity(ref)) {
    return loadEmailSenderReputation(workspaceId, key);
  }

  const admin = createAdminClient();
  let query = admin
    .from("connector_entity_profiles")
    .select("reputation_score, observation_count")
    .eq("workspace_id", workspaceId)
    .eq("category", ref.category)
    .eq("entity_type", ref.entity.type)
    .eq("entity_key", key);
  query = ref.provider
    ? query.eq("provider", ref.provider)
    : query.is("provider", null);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("[entity-profiles] load error:", error);
    return null;
  }
  if (!data) return null;

  return { score: data.reputation_score, observations: data.observation_count };
}

/**
 * Record one implicit learning observation. Positive deltas (corrections,
 * let-ins) raise reputation; negative (kept-out confirmations) lower it.
 * Creates the profile on first observation — learning must not wait for a
 * pre-existing row (the P2 dead-end lesson).
 */
export async function recordEntityObservation(
  workspaceId: string,
  ref: EntityProfileRef & { delta: number },
): Promise<void> {
  const key = normalizeRuleEntityKey(ref.entity.type, ref.entity.key);
  if (!key) return;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (isEmailSenderEntity(ref)) {
    const { data: existing } = await admin
      .from("capture_sender_profiles")
      .select("id, reputation_score")
      .eq("workspace_id", workspaceId)
      .eq("sender_key", key)
      .eq("sender_key_type", "email")
      .maybeSingle();

    if (!existing) return; // Email seeding stays with the reply loop.

    await admin
      .from("capture_sender_profiles")
      .update({
        reputation_score: clampScore(
          ((existing.reputation_score as number | null) ?? 50) + ref.delta,
        ),
        last_calculated_at: now,
      })
      .eq("id", existing.id as string);
    return;
  }

  const existing = await loadEntityReputation(workspaceId, ref);
  const nextScore = clampScore((existing?.score ?? 50) + ref.delta);
  const nextCount = (existing?.observations ?? 0) + 1;

  const { error } = await admin.from("connector_entity_profiles").upsert(
    {
      workspace_id: workspaceId,
      provider: ref.provider,
      category: ref.category,
      entity_type: ref.entity.type,
      entity_key: key,
      reputation_score: nextScore,
      observation_count: nextCount,
      last_observation_at: now,
      updated_at: now,
    },
    {
      onConflict: "workspace_id,provider,category,entity_type,entity_key",
    },
  );

  if (error) {
    console.error("[entity-profiles] record error:", error);
  }
}
