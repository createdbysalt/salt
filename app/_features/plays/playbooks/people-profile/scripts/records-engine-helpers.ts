/**
 * Read-only helper surface for the People Records playbook.
 *
 * These exports point to the deterministic records engine Salt uses for
 * admission, entity classification, identity checks, and field completion.
 * They intentionally do not write to the database. Privileged writes stay
 * behind system plays, workspace guards, and provenance writers.
 */

export {
  classifyEntity,
  completePersonFields,
  evaluateAdmission,
  recordsEnginePatterns,
  relationshipTypeToStatus,
  resolveIdentity,
} from "@/app/_features/people/records-engine";
export type {
  ExistingPersonCandidate,
  RecordsDecision,
  RecordsEntityType,
  RecordsInput,
} from "@/app/_features/people/records-engine";
