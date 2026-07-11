/**
 * Evidence Accumulator (Confidence-Gated Keeper Execution)
 *
 * Stores and aggregates observations across captures until confidence
 * crosses the user's threshold. Uses log-sigmoid scoring with source
 * diversity bonus.
 *
 * Design decisions (from 2026-07-10 research):
 * - Logarithmic corroboration (first mentions matter most)
 * - Source diversity bonus (email + meeting > 2 emails)
 * - Field-specific TTL (email = never, role = 30d, record_status = 90d)
 * - Contradictions reset confidence, wait for tie-breaker
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

// ============================================================================
// Types
// ============================================================================

export type KeeperEvidenceType =
  | "email_match"
  | "name_match"
  | "context_match"
  | "recency"
  | "frequency"
  | "llm_inference"
  | "explicit_mention"
  | "behavioral_signal"
  | "cross_reference";

export type EvidenceResolution =
  | "applied"
  | "superseded"
  | "dismissed"
  | "expired"
  | "contradicted";

export type KeeperEntityType =
  | "person"
  | "organization"
  | "work"
  | "meeting"
  | "file"
  | "me"
  | "billing";

export interface EntityEvidenceRow {
  id: string;
  workspace_id: string;
  entity_type: KeeperEntityType;
  entity_id: string;
  field_path: string;
  proposed_value: unknown;
  confidence: number;
  evidence_type: KeeperEvidenceType;
  evidence_details: Record<string, unknown>;
  source_type: string;
  source_capture_id: string | null;
  source_external_id: string | null;
  playbook_slug: string | null;
  created_at: string;
  ttl_days: number | null;
  expires_at: string | null;
  resolved_at: string | null;
  resolution: EvidenceResolution | null;
  resolution_details: Record<string, unknown> | null;
}

export interface AccumulateEvidenceInput {
  workspaceId: string;
  entityType: KeeperEntityType;
  entityId: string;
  fieldPath: string;
  proposedValue: unknown;
  confidence: number;
  evidenceType: KeeperEvidenceType;
  evidenceDetails?: Record<string, unknown>;
  sourceType: string;
  sourceCaptureId?: string;
  sourceExternalId?: string;
  playbookSlug?: string;
}

export interface AggregatedEvidence {
  entityType: KeeperEntityType;
  entityId: string;
  fieldPath: string;
  proposedValue: unknown;
  aggregatedConfidence: number;
  evidenceCount: number;
  sourceTypeCount: number;
  oldestEvidenceAt: string;
  newestEvidenceAt: string;
  evidenceIds: string[];
}

// ============================================================================
// Field TTL Configuration
// ============================================================================

/**
 * Field-specific TTL in days. null = never expires.
 * Based on real-world validity windows.
 */
export const FIELD_TTL_DAYS: Record<string, number | null> = {
  // Identity fields - permanent
  "email": null,
  "primary_email": null,
  "phone": null,

  // Classification - stable but can change
  "record_status": 90,
  "classification": 90,

  // Role/position - changes more frequently
  "role": 30,
  "title": 30,
  "job_title": 30,

  // Company/org - moderately stable
  "company_name": 60,
  "organization_id": 60,
  "industry": 90,

  // Preferences - can change
  "preferred_channel": 30,
  "timezone": 60,

  // Default for unknown fields
  "_default": 30,
};

export function getFieldTtl(fieldPath: string): number | null {
  return FIELD_TTL_DAYS[fieldPath] ?? FIELD_TTL_DAYS["_default"] ?? 30;
}

// ============================================================================
// Confidence Scoring
// ============================================================================

/**
 * Base confidence weights by evidence type.
 * These are starting points; corroboration adds more.
 */
const EVIDENCE_TYPE_WEIGHTS: Record<KeeperEvidenceType, number> = {
  explicit_mention: 40,    // Direct statement ("Jane is my client")
  email_match: 35,
  behavioral_signal: 30,   // Actions imply relationship
  llm_inference: 25,
  name_match: 20,
  context_match: 15,
  cross_reference: 15,
  recency: 10,
  frequency: 10,
};

/**
 * Compute corroborated confidence using log-sigmoid with source diversity.
 *
 * Research backing (2026-07-10):
 * - Logarithmic fit outperforms linear (r=0.52 vs r=0.46)
 * - Source diversity is more valuable than repetition
 * - Cap at 95 to preserve epistemic humility
 */
export function computeCorroboratedConfidence(
  baseConfidence: number,
  observationCount: number,
  sourceTypeCount: number,
): number {
  const logScale = 12;           // How much each additional mention adds
  const diversityBonus = 0.15;   // Extra weight for diverse sources
  const maxBoost = 50;           // Maximum boost from corroboration

  // Logarithmic boost (diminishing returns)
  const countBoost = logScale * Math.log(1 + observationCount);

  // Diversity multiplier (different source types are more valuable)
  const diversityMultiplier = 1 + (diversityBonus * (sourceTypeCount - 1));

  // Combined boost, capped
  const totalBoost = Math.min(countBoost * diversityMultiplier, maxBoost);

  // Never claim 100%
  return Math.min(Math.round(baseConfidence + totalBoost), 95);
}

/**
 * Check if values contradict each other.
 * Simple equality check for now; could be extended for semantic similarity.
 */
export function valuesContradict(a: unknown, b: unknown): boolean {
  // Null/undefined don't contradict anything
  if (a == null || b == null) return false;

  // Deep equality check
  return JSON.stringify(a) !== JSON.stringify(b);
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Add new evidence for an entity field.
 * Returns the aggregated confidence after this addition.
 */
export async function accumulateEvidence(
  input: AccumulateEvidenceInput,
): Promise<{ evidenceId: string; aggregatedConfidence: number }> {
  const admin = createAdminClient();
  const ttlDays = getFieldTtl(input.fieldPath);

  // Compute expires_at if TTL is set
  const now = new Date();
  const expiresAt = ttlDays != null
    ? new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Insert the new evidence
  const { data: evidence, error: insertError } = await admin
    .from("entity_evidence")
    .insert({
      workspace_id: input.workspaceId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      field_path: input.fieldPath,
      proposed_value: input.proposedValue,
      confidence: input.confidence,
      evidence_type: input.evidenceType,
      evidence_details: input.evidenceDetails ?? {},
      source_type: input.sourceType,
      source_capture_id: input.sourceCaptureId ?? null,
      source_external_id: input.sourceExternalId ?? null,
      playbook_slug: input.playbookSlug ?? null,
      ttl_days: ttlDays,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  // Get aggregated confidence
  const aggregated = await getAggregatedConfidence(
    input.workspaceId,
    input.entityType,
    input.entityId,
    input.fieldPath,
  );

  return {
    evidenceId: evidence.id,
    aggregatedConfidence: aggregated?.aggregatedConfidence ?? input.confidence,
  };
}

/**
 * Get aggregated confidence for an entity field.
 * Combines all unresolved evidence using log-sigmoid + diversity bonus.
 */
export async function getAggregatedConfidence(
  workspaceId: string,
  entityType: KeeperEntityType,
  entityId: string,
  fieldPath: string,
): Promise<AggregatedEvidence | null> {
  const admin = createAdminClient();

  const { data: evidenceRows, error } = await admin
    .from("entity_evidence")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("field_path", fieldPath)
    .is("resolved_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!evidenceRows || evidenceRows.length === 0) return null;

  // Check for contradictions - if values differ, we need to handle it
  const values = evidenceRows.map((e) => e.proposed_value);
  const uniqueValues = new Set(values.map((v) => JSON.stringify(v)));

  if (uniqueValues.size > 1) {
    // Contradiction detected - return null confidence (triggers "accumulate more" path)
    // In the future, could return the most recent or most corroborated value
    return {
      entityType,
      entityId,
      fieldPath,
      proposedValue: null, // Ambiguous
      aggregatedConfidence: 0, // Forces accumulation
      evidenceCount: evidenceRows.length,
      sourceTypeCount: new Set(evidenceRows.map((e) => e.source_type)).size,
      oldestEvidenceAt: evidenceRows[0].created_at,
      newestEvidenceAt: evidenceRows[evidenceRows.length - 1].created_at,
      evidenceIds: evidenceRows.map((e) => e.id),
    };
  }

  // All evidence agrees - compute corroborated confidence
  const sourceTypes = new Set(evidenceRows.map((e) => e.source_type));
  const baseConfidence = Math.max(...evidenceRows.map((e) => e.confidence));

  const aggregatedConfidence = computeCorroboratedConfidence(
    baseConfidence,
    evidenceRows.length,
    sourceTypes.size,
  );

  return {
    entityType,
    entityId,
    fieldPath,
    proposedValue: evidenceRows[0].proposed_value,
    aggregatedConfidence,
    evidenceCount: evidenceRows.length,
    sourceTypeCount: sourceTypes.size,
    oldestEvidenceAt: evidenceRows[0].created_at,
    newestEvidenceAt: evidenceRows[evidenceRows.length - 1].created_at,
    evidenceIds: evidenceRows.map((e) => e.id),
  };
}

/**
 * Resolve evidence when threshold is crossed (or other resolution).
 */
export async function resolveEvidence(
  workspaceId: string,
  evidenceIds: string[],
  resolution: EvidenceResolution,
  details?: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("entity_evidence")
    .update({
      resolved_at: new Date().toISOString(),
      resolution,
      resolution_details: details ?? {},
    })
    .eq("workspace_id", workspaceId)
    .in("id", evidenceIds);

  if (error) throw error;
}

/**
 * Get all pending evidence for an entity (across all fields).
 * Used when a new capture affects an entity to re-evaluate all pending evidence.
 */
export async function getPendingEvidenceForEntity(
  workspaceId: string,
  entityType: KeeperEntityType,
  entityId: string,
): Promise<Map<string, AggregatedEvidence>> {
  const admin = createAdminClient();

  const { data: evidenceRows, error } = await admin
    .from("entity_evidence")
    .select("field_path")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("resolved_at", null);

  if (error) throw error;
  if (!evidenceRows) return new Map();

  // Get unique field paths
  const fieldPaths = [...new Set(evidenceRows.map((e) => e.field_path))];

  // Aggregate each field
  const results = new Map<string, AggregatedEvidence>();
  for (const fieldPath of fieldPaths) {
    const aggregated = await getAggregatedConfidence(
      workspaceId,
      entityType,
      entityId,
      fieldPath,
    );
    if (aggregated) {
      results.set(fieldPath, aggregated);
    }
  }

  return results;
}

/**
 * Expire old evidence (called by cron).
 */
export async function expireOldEvidence(workspaceId?: string): Promise<number> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  let query = admin
    .from("entity_evidence")
    .update({
      resolved_at: now,
      resolution: "expired" as EvidenceResolution,
      resolution_details: { expired_at: now },
    })
    .is("resolved_at", null)
    .not("expires_at", "is", null)
    .lt("expires_at", now);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data, error } = await query.select("id");

  if (error) throw error;
  return data?.length ?? 0;
}
