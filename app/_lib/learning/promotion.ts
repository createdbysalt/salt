/**
 * Evidence → Play Promotion
 *
 * Bridges accumulated entity_evidence records to play creation.
 * When evidence confidence crosses threshold, promotes to a play.
 *
 * Part of the LEARN → ACT → GROW loop (Phase 5).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getSignalDefinition, isValidSignalKey } from "./signals";
import type { LearningEntityType } from "./types";

export interface PromotionCandidate {
  entityType: LearningEntityType;
  entityId: string;
  fieldPath: string;
  proposedValue: string;
  confidence: number;
  evidenceIds: string[];
  sourceTypes: string[];
  playbookSlug: string | null;
}

export interface PromotionResult {
  promoted: boolean;
  playRunId?: string;
  reason: string;
}

const PROMOTION_THRESHOLDS: Record<string, number> = {
  relationship_type: 85,
  company: 80,
  role: 80,
  location: 75,
  industry: 75,
  default: 85,
};

function getPromotionThreshold(fieldPath: string): number {
  return PROMOTION_THRESHOLDS[fieldPath] ?? PROMOTION_THRESHOLDS.default;
}

export async function findPromotionCandidates(
  workspaceId: string
): Promise<PromotionCandidate[]> {
  const admin = createAdminClient();

  const { data: evidence, error } = await admin
    .from("entity_evidence")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .gte("confidence", 70)
    .order("confidence", { ascending: false })
    .limit(100);

  if (error || !evidence) {
    console.error("Failed to find promotion candidates:", error);
    return [];
  }

  const grouped = new Map<string, PromotionCandidate>();

  for (const e of evidence) {
    const key = `${e.entity_type}:${e.entity_id}:${e.field_path}:${e.proposed_value}`;
    let candidate = grouped.get(key);

    if (!candidate) {
      candidate = {
        entityType: e.entity_type as LearningEntityType,
        entityId: e.entity_id,
        fieldPath: e.field_path,
        proposedValue: e.proposed_value,
        confidence: 0,
        evidenceIds: [],
        sourceTypes: [],
        playbookSlug: e.playbook_slug,
      };
      grouped.set(key, candidate);
    }

    candidate.confidence = Math.max(candidate.confidence, e.confidence);
    candidate.evidenceIds.push(e.id);
    if (!candidate.sourceTypes.includes(e.source_type)) {
      candidate.sourceTypes.push(e.source_type);
    }
  }

  return Array.from(grouped.values()).filter(
    (c) => c.confidence >= getPromotionThreshold(c.fieldPath)
  );
}

export async function promoteEvidenceToPlay(
  workspaceId: string,
  candidate: PromotionCandidate
): Promise<PromotionResult> {
  const admin = createAdminClient();
  const threshold = getPromotionThreshold(candidate.fieldPath);

  if (candidate.confidence < threshold) {
    return {
      promoted: false,
      reason: `Confidence ${candidate.confidence}% below threshold ${threshold}%`,
    };
  }

  let entityLabel = "Unknown";
  if (candidate.entityType === "person") {
    const { data: person } = await admin
      .from("people")
      .select("display_name, email")
      .eq("id", candidate.entityId)
      .single();
    entityLabel = person?.display_name ?? person?.email ?? "Unknown Person";
  } else if (candidate.entityType === "organization") {
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", candidate.entityId)
      .single();
    entityLabel = org?.name ?? "Unknown Organization";
  }

  const signalKey = `${candidate.entityType}_${candidate.fieldPath}_updated`;
  const signalDef = isValidSignalKey(signalKey) ? getSignalDefinition(signalKey) : null;
  const canTriggerActing = signalDef?.canTriggerActing ?? false;

  const title = `Save ${formatFieldLabel(candidate.fieldPath)} for ${entityLabel}`;
  const preview = `Salt observed ${candidate.proposedValue} with ${Math.round(candidate.confidence)}% confidence from ${candidate.sourceTypes.length} source${candidate.sourceTypes.length > 1 ? "s" : ""}.`;

  const { data: playRun, error: insertError } = await admin
    .from("play_runs")
    .insert({
      workspace_id: workspaceId,
      target_type: candidate.entityType,
      target_id: candidate.entityId,
      target_label: entityLabel,
      state: "queued",
      queue: canTriggerActing ? "needs_you" : "auto_handled",
      stakes: "medium",
      title,
      preview,
      confidence: candidate.confidence,
      evidence_ids: candidate.evidenceIds,
      source_context: {
        source: "playbook",
        playbook_slug: candidate.playbookSlug ?? "keeper-evidence-promotion",
        trigger_signal: signalKey,
      },
      metadata: {
        player_slug: "keeper",
        playbook_name: "Evidence Promotion",
        keeper_profile: true,
        profile_field: candidate.fieldPath,
        profile_value: candidate.proposedValue,
        source_types: candidate.sourceTypes,
        primary_label: `Save ${candidate.proposedValue}`,
        trigger_label: `From ${candidate.sourceTypes.length} source${candidate.sourceTypes.length > 1 ? "s" : ""}`,
      },
    })
    .select("id")
    .single();

  if (insertError || !playRun) {
    return {
      promoted: false,
      reason: insertError?.message ?? "Could not create play run",
    };
  }

  const now = new Date().toISOString();
  await admin
    .from("entity_evidence")
    .update({
      resolved_at: now,
      resolution: "promoted",
    })
    .in("id", candidate.evidenceIds)
    .eq("workspace_id", workspaceId);

  return {
    promoted: true,
    playRunId: playRun.id,
    reason: `Promoted to play ${playRun.id}`,
  };
}

export async function runPromotionPass(workspaceId: string): Promise<{
  candidatesFound: number;
  promoted: number;
  errors: string[];
}> {
  const candidates = await findPromotionCandidates(workspaceId);
  let promoted = 0;
  const errors: string[] = [];

  for (const candidate of candidates) {
    const result = await promoteEvidenceToPlay(workspaceId, candidate);
    if (result.promoted) {
      promoted++;
    } else {
      errors.push(`${candidate.entityId}:${candidate.fieldPath}: ${result.reason}`);
    }
  }

  return {
    candidatesFound: candidates.length,
    promoted,
    errors,
  };
}

function formatFieldLabel(fieldPath: string): string {
  const labels: Record<string, string> = {
    relationship_type: "relationship",
    company: "company",
    role: "role",
    location: "location",
    industry: "industry",
    size: "size",
  };
  return labels[fieldPath] ?? fieldPath.replace(/_/g, " ");
}
