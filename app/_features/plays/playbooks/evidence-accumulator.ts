/**
 * Evidence Accumulator
 *
 * @deprecated Import from `@/app/_lib/learning` instead.
 * This file re-exports for backward compatibility.
 */

export {
  // Types
  type LearningEntityType as KeeperEntityType,
  type EvidenceType as KeeperEvidenceType,
  type EvidenceResolution,
  type EntityEvidenceRow,
  type AccumulateEvidenceInput,
  type AggregatedEvidence,
  // Constants
  FIELD_TTL_DAYS,
  EVIDENCE_TYPE_WEIGHTS,
  // Functions
  getFieldTtl,
  computeCorroboratedConfidence,
  valuesContradict,
  accumulateEvidence,
  getAggregatedConfidence,
  resolveEvidence,
  getPendingEvidenceForEntity,
  expireOldEvidence,
} from "@/app/_lib/learning";
