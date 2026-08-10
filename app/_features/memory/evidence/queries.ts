/**
 * Evidence Queries
 *
 * Read operations for pending evidence.
 */

import { createClient } from "@/app/_lib/supabase/server";
import {
  fromLearningDbEntityType,
  toLearningDbEntityType,
  type LearningEntityType,
} from "@/app/_lib/learning";
import {
  logOddsToProbability,
  type IntakeEntityType,
} from "@/app/_features/memory/care/intake";
import type {
  PendingEvidenceRow,
  PendingEvidenceSignalRow,
  PendingEvidenceWithSignals,
  EvidenceStatus,
} from "./types";

function toPendingEvidenceDbType(entityType: IntakeEntityType): string {
  return toLearningDbEntityType(entityType as LearningEntityType);
}

function normalizePendingEvidenceRow<T extends PendingEvidenceRow>(row: T): T {
  const entityType =
    (fromLearningDbEntityType(row.entity_type) as IntakeEntityType | null) ??
    row.entity_type;
  return { ...row, entity_type: entityType };
}

/**
 * Get all pending evidence for a workspace.
 */
export async function getPendingEvidence(
  workspaceId: string,
  options?: {
    status?: EvidenceStatus | EvidenceStatus[];
    entityType?: IntakeEntityType;
    limit?: number;
  }
): Promise<PendingEvidenceWithSignals[]> {
  const supabase = await createClient();

  let query = supabase
    .from("pending_evidence")
    .select(
      `
      *,
      signals:pending_evidence_signals(*)
    `
    )
    .eq("workspace_id", workspaceId)
    .order("log_odds_score", { ascending: false });

  if (options?.status) {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    query = query.in("status", statuses);
  }

  if (options?.entityType) {
    query = query.eq("entity_type", toPendingEvidenceDbType(options.entityType));
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((row: PendingEvidenceRow & { signals?: PendingEvidenceSignalRow[] }) => {
    const normalized = normalizePendingEvidenceRow(row);
    return {
      ...normalized,
      signals: row.signals || [],
      confidencePercent: logOddsToProbability(normalized.log_odds_score),
    };
  });
}

/**
 * Get suggested records (ready to create).
 */
export async function getSuggestedRecords(
  workspaceId: string,
  options?: {
    entityType?: IntakeEntityType;
    limit?: number;
  }
): Promise<PendingEvidenceWithSignals[]> {
  return getPendingEvidence(workspaceId, {
    status: "suggested",
    ...options,
  });
}

/**
 * Get a single pending evidence by ID.
 */
export async function getPendingEvidenceById(
  evidenceId: string
): Promise<PendingEvidenceWithSignals | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pending_evidence")
    .select(
      `
      *,
      signals:pending_evidence_signals(*)
    `
    )
    .eq("id", evidenceId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const normalized = normalizePendingEvidenceRow(data as PendingEvidenceRow);
  return {
    ...normalized,
    signals: data.signals || [],
    confidencePercent: logOddsToProbability(normalized.log_odds_score),
  };
}

/**
 * Find existing evidence by identifier.
 */
export async function findEvidenceByIdentifier(
  workspaceId: string,
  entityType: IntakeEntityType,
  identifier: string
): Promise<PendingEvidenceRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pending_evidence")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", toPendingEvidenceDbType(entityType))
    .eq("identifier", identifier)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data ? normalizePendingEvidenceRow(data as PendingEvidenceRow) : null;
}

/**
 * Count pending evidence by status.
 */
export async function countPendingEvidence(
  workspaceId: string
): Promise<Record<EvidenceStatus, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pending_evidence")
    .select("status")
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  const counts: Record<EvidenceStatus, number> = {
    watching: 0,
    suggested: 0,
    created: 0,
    dismissed: 0,
  };

  for (const row of data || []) {
    counts[row.status as EvidenceStatus]++;
  }

  return counts;
}
