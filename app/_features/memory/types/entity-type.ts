/**
 * Memory Entity Type — the canonical union (keeper-field-contracts 3.5).
 *
 * App code speaks THIS vocabulary. The database speaks three dialects,
 * accumulated across eras; adapt at the DB boundary with the functions
 * below instead of hardcoding spellings:
 *
 * | Dialect      | Tables                                                       | Spellings                                    |
 * |--------------|--------------------------------------------------------------|----------------------------------------------|
 * | "short"      | entity_links, entity_source_history, entity_tag_assignments  | person, org, work, billing, meeting, resource |
 * | "provenance" | profile_field_provenance, lifecycle_events, notes, playbooks | person, organization, work (Phase 6 adds operator/workspace) |
 * | "relations"  | entity_relations (retired by Phase 4)                        | person, organization, work, billing_record   |
 *
 * Product noun: **Resources**. App type is `resource`; after the
 * `20260810150000_rename_files_to_resources` migration the DB spelling is
 * also `resource`. `fromDbEntityType` still normalizes legacy `file` reads.
 *
 * No bulk refactor accompanies this file — existing call sites migrate to
 * the adapters as their surfaces are touched (Phase 4 edge-store rebuild,
 * Phase 6 provenance parity).
 */

export const MEMORY_ENTITY_TYPES = [
  "person",
  "org",
  "work",
  "billing",
  "meeting",
  "resource",
  "note",
  "me",
] as const;

export type MemoryEntityType = (typeof MEMORY_ENTITY_TYPES)[number];

export function isMemoryEntityType(value: string | null | undefined): value is MemoryEntityType {
  return (
    value != null && (MEMORY_ENTITY_TYPES as readonly string[]).includes(value)
  );
}

export type EntityTypeDialect = "short" | "provenance" | "relations";

/**
 * Canonical app type → the spelling a given table dialect stores.
 * Note: each dialect's CHECK admits only a subset of memory types (see the
 * table above) — the caller stays responsible for writing to a table that
 * accepts the entity at all.
 */
export function toDbEntityType(
  type: MemoryEntityType,
  dialect: EntityTypeDialect = "short"
): string {
  if (dialect === "short") return type;
  if (type === "org") return "organization";
  if (type === "billing" && dialect === "relations") return "billing_record";
  return type;
}

/** Any DB spelling (any dialect) → the canonical app type; null if unknown. */
export function fromDbEntityType(value: string | null | undefined): MemoryEntityType | null {
  if (!value) return null;
  if (value === "file") return "resource";
  if (value === "organization") return "org";
  if (value === "billing_record") return "billing";
  // Phase 6 provenance widening: operator facts surface on the Me record.
  if (value === "operator") return "me";
  return isMemoryEntityType(value) ? value : null;
}
