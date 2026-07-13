/**
 * Memory Tools - Protected Tools for Memory Record Mutations
 *
 * These tools enforce workspace confidence thresholds regardless of caller.
 * Whether a playbook, Ask Salt, or manual UI calls these tools, they apply
 * the same protection.
 *
 * Key insight: Protection lives in the tools, not the callers.
 *
 * @example
 * ```ts
 * import {
 *   memoryUpdateField,
 *   memoryGetFacts,
 *   memoryGetEvidence,
 * } from "@/app/_lib/memory-tools";
 *
 * // Update a field (threshold-gated)
 * const result = await memoryUpdateField({
 *   workspaceId,
 *   entityType: "person",
 *   entityId,
 *   field: "relationship_type",
 *   value: "client",
 *   confidence: 95,
 *   because: "Payment received",
 *   source: "playbook",
 * });
 *
 * if (result.action === "applied") {
 *   console.log("Field updated");
 * } else {
 *   console.log("Evidence accumulated, waiting for more signals");
 * }
 * ```
 */

// Types
export type {
  LearningEntityType,
  EvidenceType,
  ToolSource,
  UpdateAction,
  EvidenceChainItemType,
  EvidenceChainItem,
  UpdateFieldInput,
  UpdateFieldResult,
  AccumulateInput,
  AccumulateResult,
  GetFactsInput,
  GetFactsResult,
  EntityFact,
  GetEvidenceInput,
  GetEvidenceResult,
  PendingEvidence,
  ResolveEvidenceInput,
  ResolveEvidenceResult,
  ThresholdSettings,
} from "./types";

export { DEFAULT_THRESHOLD_SETTINGS } from "./types";

// Protected update tool (main entry point)
export { memoryUpdateField } from "./update-field";

// Rollback tool
export { memoryRollbackField } from "./rollback-field";
export type {
  RollbackFieldInput,
  RollbackFieldResult,
} from "./rollback-field";

// Correction learning
export { memoryRecordCorrection, getCorrectionAnalytics } from "./record-correction";
export type {
  RecordCorrectionInput,
  RecordCorrectionResult,
  CorrectionPattern,
} from "./record-correction";

// Evidence tools
export { memoryAccumulateEvidence } from "./accumulate-evidence";
export { memoryGetEvidence, memoryCheckReadyEvidence } from "./get-evidence";
export { memoryResolveEvidence } from "./resolve-evidence";

// Conflict detection
export {
  memoryGetConflicts,
  detectAndRecordConflict,
  resolveConflict,
} from "./get-conflicts";
export type {
  ConflictType,
  ConflictCandidate,
  FieldConflict,
  GetConflictsInput,
  GetConflictsResult,
} from "./get-conflicts";

// Facts retrieval
export { memoryGetFacts } from "./get-facts";

// Threshold management
export { getWorkspaceThreshold, getWorkspaceThresholds } from "./get-threshold";

// ============================================================================
// Duplicate Detection Tools (Duplicate Detector playbook)
// ============================================================================

export { memoryGetSimilarRecords } from "./get-similar";
export type {
  SimilarityMatch,
  GetSimilarInput,
  GetSimilarResult,
} from "./get-similar";

export { memoryCompareDuplicates } from "./compare-duplicates";
export type {
  FieldComparison,
  CompareDuplicatesInput,
  CompareDuplicatesResult,
} from "./compare-duplicates";

export { memoryMergeRecords } from "./merge-records";
export type {
  MergeRecordsInput,
  MergeRecordsResult,
} from "./merge-records";

// ============================================================================
// Hygiene Tools (Memory Hygiene playbook)
// ============================================================================

export { memoryGetStaleRecords } from "./get-stale";
export type {
  StaleRecord,
  GetStaleInput,
  GetStaleResult,
} from "./get-stale";

export { memoryGetIncompleteRecords } from "./get-incomplete";
export type {
  IncompleteRecord,
  GetIncompleteInput,
  GetIncompleteResult,
} from "./get-incomplete";

export { memoryGetOrphanRecords } from "./get-orphan";
export type {
  OrphanRecord,
  GetOrphanInput,
  GetOrphanResult,
} from "./get-orphan";

export { memoryArchiveRecord, memoryRestoreRecord } from "./archive-record";
export type {
  ArchiveRecordInput,
  ArchiveRecordResult,
  RestoreRecordInput,
  RestoreRecordResult,
} from "./archive-record";

export { memoryLinkEntities, memoryUnlinkEntities } from "./link-entities";
export type {
  LinkRelationType,
  LinkEntitiesInput,
  LinkEntitiesResult,
  UnlinkEntitiesInput,
  UnlinkEntitiesResult,
} from "./link-entities";
