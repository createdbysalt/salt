/**
 * Learning entity-type adapters (app ↔ DB).
 *
 * App code speaks `LearningEntityType` with `"resource"`. Several DB CHECKs
 * (pending_evidence, salt_learnings, profile_field_provenance, …) still store
 * the legacy spelling `"file"`. Map at every read/write boundary — never rename
 * the `public.files` table as part of this migration.
 */

import type { LearningEntityType } from "./types";

/** Spelling stored in Learning-related DB columns that still admit `'file'`. */
export type LearningDbEntityType =
  | Exclude<LearningEntityType, "resource">
  | "file";

const LEARNING_ENTITY_TYPES: readonly LearningEntityType[] = [
  "person",
  "organization",
  "work",
  "meeting",
  "resource",
  "me",
  "billing",
] as const;

export function isLearningEntityType(
  value: string | null | undefined
): value is LearningEntityType {
  return (
    value != null &&
    (LEARNING_ENTITY_TYPES as readonly string[]).includes(value)
  );
}

/**
 * App type → DB spelling for entity_evidence / pending_evidence / salt_learnings /
 * profile_field_provenance / field_conflicts (and similar CHECKs that admit `'file'`).
 */
export function toLearningDbEntityType(
  type: LearningEntityType
): LearningDbEntityType {
  return type === "resource" ? "file" : type;
}

/**
 * Any DB spelling → app `LearningEntityType`.
 * Accepts legacy `"file"` and passthrough `"resource"` if already stored.
 */
export function fromLearningDbEntityType(
  value: string | null | undefined
): LearningEntityType | null {
  if (!value) return null;
  if (value === "file" || value === "resource") return "resource";
  return isLearningEntityType(value) ? value : null;
}
