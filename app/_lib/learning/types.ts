/**
 * Learning Infrastructure Types
 *
 * Shared types for the evidence accumulation and signal registry systems.
 * Used across Memory Care, the enrichment layer, and Ask Salt.
 */

export type LearningEntityType =
  | "person"
  | "organization"
  | "work"
  | "meeting"
  | "resource"
  | "me"
  | "billing";

export type EvidenceType =
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

export type SignalSurface =
  | "person"
  | "organization"
  | "work"
  | "billing"
  | "meeting"
  | "resource"
  | "note"
  | "operator"
  | "capture"
  | "workspace";

export interface SignalDefinition {
  key: string;
  surface: SignalSurface;
  description: string;
  firesWhen: string;
  canTriggerActing: boolean;
}

export interface EntityEvidenceRow {
  id: string;
  workspace_id: string;
  entity_type: LearningEntityType;
  entity_id: string;
  field_path: string;
  proposed_value: unknown;
  confidence: number;
  evidence_type: EvidenceType;
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
  entityType: LearningEntityType;
  entityId: string;
  fieldPath: string;
  proposedValue: unknown;
  confidence: number;
  evidenceType: EvidenceType;
  evidenceDetails?: Record<string, unknown>;
  sourceType: string;
  sourceCaptureId?: string;
  sourceExternalId?: string;
  playbookSlug?: string;
}

export interface AggregatedEvidence {
  entityType: LearningEntityType;
  entityId: string;
  fieldPath: string;
  proposedValue: unknown;
  aggregatedConfidence: number;
  evidenceCount: number;
  sourceTypeCount: number;
  oldestEvidenceAt: string;
  newestEvidenceAt: string;
  evidenceIds: string[];
  /** True if evidence contains contradicting values that need user resolution */
  hasConflict?: boolean;
}
