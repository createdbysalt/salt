/**
 * Memory Records Playbook - Scripts Index
 *
 * Re-exports all playbook scripts for external consumption.
 * Ask Salt and other consumers import from here.
 */

// Run script - signal-driven upkeep
export { run, type RunInput, type RunResult } from "./run";

// Intake script - multi-entity parsing and orchestration
export {
  // Parsing
  parseIntakeRequest,
  getCreationOrder,
  getMissingFieldsToWatch,
  extractAmountCents,
  extractDateHints,
  // Constants
  ENTITY_TIERS,
  WATCH_TRIGGER_FIELDS,
  RECORD_QUALIFIERS,
  // Evidence accumulation
  SIGNAL_WEIGHTS,
  EVIDENCE_THRESHOLDS,
  canonicalizeIdentifier,
  accumulateEvidence,
  evaluateEvidence,
  logOddsToProbability,
  probabilityToLogOdds,
  // Types
  type IntakeEntityType,
  type ParsedEntity,
  type ParsedIntakeRequest,
  type RecordQualifier,
  type EvidenceSignal,
  type PendingEvidence,
  type ExtractedValue,
} from "./intake";
