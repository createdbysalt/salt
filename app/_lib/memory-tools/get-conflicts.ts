/**
 * memoryGetConflicts - Surface evidence contradictions to users
 *
 * When evidence for a field is split (e.g., 50/50 between two values),
 * we surface it as a conflict for the user to resolve instead of silently
 * waiting for more evidence.
 *
 * @example
 * ```ts
 * const conflicts = await memoryGetConflicts({
 *   workspaceId: "...",
 *   entityType: "person",
 *   entityId: "...",
 * });
 *
 * // conflicts = [{
 * //   field: "relationship_type",
 * //   conflictType: "value_split",
 * //   candidates: [
 * //     { value: "client", confidence: 85, sources: ["stripe"] },
 * //     { value: "prospect", confidence: 80, sources: ["email"] },
 * //   ],
 * //   detectedAt: "2026-07-11T...",
 * // }]
 * ```
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  fromLearningDbEntityType,
  toLearningDbEntityType,
} from "@/app/_lib/learning";
import type { Json } from "@/app/_lib/supabase/database.types";
import type { LearningEntityType } from "./types";

export type ConflictType =
  | "value_split"
  | "source_disagree"
  | "recency_unclear"
  | "user_vs_system";

export interface ConflictCandidate {
  value: unknown;
  confidence: number;
  evidenceCount: number;
  sources: string[];
}

export interface FieldConflict {
  id: string;
  entityType: LearningEntityType;
  entityId: string;
  field: string;
  conflictType: ConflictType;
  candidates: ConflictCandidate[];
  detectedAt: string;
  resolved: boolean;
  resolvedBy?: "user" | "tiebreaker" | "timeout";
  resolvedAt?: string;
  resolutionValue?: unknown;
}

export interface GetConflictsInput {
  workspaceId: string;
  entityType?: LearningEntityType;
  entityId?: string;
  includeResolved?: boolean;
}

export interface GetConflictsResult {
  conflicts: FieldConflict[];
  totalCount: number;
}

/**
 * Candidates are stored in a Json column; this is the single read boundary.
 * The cast through unknown is needed because ConflictCandidate carries
 * `value: unknown`, which Json cannot express.
 */
function candidatesFromJson(value: Json): ConflictCandidate[] {
  return Array.isArray(value) ? (value as unknown as ConflictCandidate[]) : [];
}

/**
 * Get conflicts for an entity or workspace.
 */
export async function memoryGetConflicts(
  input: GetConflictsInput
): Promise<GetConflictsResult> {
  const admin = createAdminClient();

  let query = admin
    .from("field_conflicts")
    .select("*", { count: "exact" })
    .eq("workspace_id", input.workspaceId)
    .order("detected_at", { ascending: false });

  if (input.entityType) {
    query = query.eq("entity_type", toLearningDbEntityType(input.entityType));
  }

  if (input.entityId) {
    query = query.eq("entity_id", input.entityId);
  }

  if (!input.includeResolved) {
    query = query.eq("resolved", false);
  }

  const { data, count, error } = await query.limit(50);

  if (error) {
    throw new Error(`Failed to get conflicts: ${error.message}`);
  }

  const conflicts: FieldConflict[] = (data ?? []).map((row) => ({
    id: row.id,
    entityType:
      fromLearningDbEntityType(row.entity_type) ??
      (row.entity_type as LearningEntityType),
    entityId: row.entity_id,
    field: row.field,
    conflictType: row.conflict_type as ConflictType,
    candidates: candidatesFromJson(row.candidates),
    detectedAt: row.detected_at,
    resolved: row.resolved,
    resolvedBy: row.resolved_by as FieldConflict["resolvedBy"],
    resolvedAt: row.resolved_at ?? undefined,
    resolutionValue: row.resolution_value ?? undefined,
  }));

  return {
    conflicts,
    totalCount: count ?? conflicts.length,
  };
}

/**
 * Detect and record a conflict from evidence.
 * Called by getAggregatedConfidence when it detects contradicting values.
 */
export async function detectAndRecordConflict(input: {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  field: string;
  evidenceRows: Array<{
    id: string;
    proposed_value: unknown;
    confidence: number;
    source_type: string;
    created_at: string;
  }>;
}): Promise<FieldConflict | null> {
  const admin = createAdminClient();

  // Group evidence by value
  const valueGroups = new Map<
    string,
    {
      value: unknown;
      confidence: number;
      count: number;
      sources: Set<string>;
    }
  >();

  for (const row of input.evidenceRows) {
    const key = JSON.stringify(row.proposed_value);
    const existing = valueGroups.get(key);

    if (existing) {
      existing.confidence = Math.max(existing.confidence, row.confidence);
      existing.count++;
      existing.sources.add(row.source_type);
    } else {
      valueGroups.set(key, {
        value: row.proposed_value,
        confidence: row.confidence,
        count: 1,
        sources: new Set([row.source_type]),
      });
    }
  }

  // Need at least 2 different values
  if (valueGroups.size < 2) {
    return null;
  }

  // Determine conflict type
  const conflictType = determineConflictType(valueGroups, input.evidenceRows);

  // Build candidates
  const candidates: ConflictCandidate[] = Array.from(valueGroups.values()).map(
    (g) => ({
      value: g.value,
      confidence: g.confidence,
      evidenceCount: g.count,
      sources: Array.from(g.sources),
    })
  );

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Check if conflict already exists
  const dbEntityType = toLearningDbEntityType(input.entityType);

  const { data: existing } = await admin
    .from("field_conflicts")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("entity_type", dbEntityType)
    .eq("entity_id", input.entityId)
    .eq("field", input.field)
    .eq("resolved", false)
    .maybeSingle();

  if (existing) {
    // Update existing conflict
    const { data: updated } = await admin
      .from("field_conflicts")
      .update({
        candidates: candidates as unknown as Json,
        conflict_type: conflictType,
      })
      .eq("id", existing.id)
      .select()
      .single();

    return updated
      ? {
          id: updated.id,
          entityType:
            fromLearningDbEntityType(updated.entity_type) ?? input.entityType,
          entityId: updated.entity_id,
          field: updated.field,
          conflictType: updated.conflict_type as ConflictType,
          candidates: candidatesFromJson(updated.candidates),
          detectedAt: updated.detected_at,
          resolved: updated.resolved,
        }
      : null;
  }

  // Create new conflict
  const { data: conflict, error } = await admin
    .from("field_conflicts")
    .insert({
      workspace_id: input.workspaceId,
      entity_type: dbEntityType,
      entity_id: input.entityId,
      field: input.field,
      conflict_type: conflictType,
      candidates: candidates as unknown as Json,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record conflict: ${error.message}`);
  }

  return {
    id: conflict.id,
    entityType:
      fromLearningDbEntityType(conflict.entity_type) ?? input.entityType,
    entityId: conflict.entity_id,
    field: conflict.field,
    conflictType: conflict.conflict_type as ConflictType,
    candidates: candidatesFromJson(conflict.candidates),
    detectedAt: conflict.detected_at,
    resolved: conflict.resolved,
  };
}

/**
 * Resolve a conflict.
 */
export async function resolveConflict(input: {
  conflictId: string;
  resolvedBy: "user" | "tiebreaker" | "timeout";
  resolutionValue?: unknown;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("field_conflicts")
    .update({
      resolved: true,
      resolved_by: input.resolvedBy,
      resolved_at: new Date().toISOString(),
      // Cast from unknown at the write boundary; undefined stays undefined so
      // the column is left untouched when no value is provided.
      resolution_value: input.resolutionValue as Json | undefined,
    })
    .eq("id", input.conflictId);

  if (error) {
    throw new Error(`Failed to resolve conflict: ${error.message}`);
  }
}

function determineConflictType(
  valueGroups: Map<
    string,
    { value: unknown; confidence: number; count: number; sources: Set<string> }
  >,
  evidenceRows: Array<{ source_type: string }>
): ConflictType {
  const groups = Array.from(valueGroups.values());

  // Check if it's user vs system
  const hasManual = groups.some((g) =>
    g.sources.has("manual") || g.sources.has("ask_salt")
  );
  const hasAuto = groups.some((g) =>
    Array.from(g.sources).some(
      (s) => s !== "manual" && s !== "ask_salt"
    )
  );

  if (hasManual && hasAuto) {
    return "user_vs_system";
  }

  // Check if sources disagree (all sources in one group, all different in another)
  const sourceSets = groups.map((g) => g.sources);
  const overlap = [...sourceSets[0]].some((s) =>
    sourceSets.slice(1).some((set) => set.has(s))
  );

  if (!overlap && groups.length === 2) {
    return "source_disagree";
  }

  // Default: value_split (evidence is roughly equally distributed)
  return "value_split";
}
