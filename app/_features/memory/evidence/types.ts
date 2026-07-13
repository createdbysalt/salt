/**
 * Evidence Accumulation Types
 *
 * Supports proactive record detection from captures using
 * Fellegi-Sunter log-odds scoring.
 */

import type { IntakeEntityType } from "@/app/_features/plays/playbooks/v2/_meta/memory-records/scripts";

export type EvidenceStatus = "watching" | "suggested" | "created" | "dismissed";

/**
 * Database row for pending_evidence table.
 */
export interface PendingEvidenceRow {
  id: string;
  workspace_id: string;
  entity_type: IntakeEntityType;
  identifier: string;
  log_odds_score: number;
  status: EvidenceStatus;
  first_seen_at: string;
  last_signal_at: string;
  extracted_fields: Record<string, ExtractedFieldValue>;
  created_record_id: string | null;
  created_at: string | null;
  dismissed_at: string | null;
  dismissed_reason: string | null;
}

/**
 * Database row for pending_evidence_signals table.
 */
export interface PendingEvidenceSignalRow {
  id: string;
  evidence_id: string;
  signal: string;
  weight: number;
  capture_id: string | null;
  extracted_data: Record<string, string>;
  created_at: string;
}

/**
 * Extracted field with provenance tracking.
 */
export interface ExtractedFieldValue {
  value: string;
  confidence: number;
  sources: string[]; // capture IDs that contributed
}

/**
 * Input for adding a signal to evidence.
 */
export interface AddSignalInput {
  workspaceId: string;
  entityType: IntakeEntityType;
  identifier: string;
  signal: string;
  captureId?: string;
  extractedData?: Record<string, string>;
}

/**
 * Result of adding a signal.
 */
export interface AddSignalResult {
  evidenceId: string;
  newScore: number;
  previousScore: number;
  action: "watch" | "suggest" | "auto" | "dismiss";
  isNew: boolean;
}

/**
 * Pending evidence with signals for display.
 */
export interface PendingEvidenceWithSignals extends PendingEvidenceRow {
  signals: PendingEvidenceSignalRow[];
  confidencePercent: number;
}
