/**
 * Learning entity-type adapters (app ↔ DB).
 *
 * App code speaks `LearningEntityType` with `"resource"`. After the
 * `20260810150000_rename_files_to_resources` migration, the DB spelling is
 * also `"resource"`. `fromLearningDbEntityType` still normalizes the legacy
 * `"file"` spelling for reads against pre-migration rows.
 */

import type { LearningEntityType } from "./types";

/** Spelling stored in Learning-related DB columns. */
export type LearningDbEntityType = LearningEntityType;

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
 * App type → DB spelling. Post-rename this is the identity; kept as a
 * function so call sites have a single seam if the DB ever diverges again.
 */
export function toLearningDbEntityType(
  type: LearningEntityType
): LearningDbEntityType {
  return type;
}

/**
 * Any DB spelling → app `LearningEntityType`.
 * Normalizes legacy `"file"` rows written before the rename.
 */
export function fromLearningDbEntityType(
  value: string | null | undefined
): LearningEntityType | null {
  if (!value) return null;
  if (value === "file") return "resource";
  return isLearningEntityType(value) ? value : null;
}
