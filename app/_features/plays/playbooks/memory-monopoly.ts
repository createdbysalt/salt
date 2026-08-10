/**
 * Memory-write monopoly enforcement.
 *
 * Invariant: No playbook may mutate Memory records. Playbooks may READ
 * memory (fetch steps), but any act step with a memory-mutating slug is
 * rejected at parse and at runtime.
 *
 * Memory mutations are owned by Memory Care (`app/_features/memory/care`)
 * and the protected memory tools (`app/_lib/memory-tools`), which enforce
 * tiered confidence bars and provenance. This module is the structural
 * guardrail making user-created playbooks safe by construction.
 *
 * Exception: Ask SALT's chat memory_* system plays are the human-in-chat
 * path, NOT plays — unaffected by this constraint.
 */

import type { PlaybookSection } from "../types";

export const MEMORY_MUTATING_SLUGS = [
  "memory_create_person",
  "memory_update_person",
  "memory_archive_person",
  "memory_classify_person",
  "memory_create_org",
  "memory_update_org",
  "memory_archive_org",
  "memory_create_work",
  "memory_update_work",
  "memory_archive_work",
  "memory_link_person_org",
  "memory_unlink_person_org",
  "memory_link_person_work",
  "memory_unlink_person_work",
  "memory_link_person_person",
  "memory_unlink_person_person",
  "memory_link_person_space",
  "memory_unlink_person_space",
  "memory_link_org_work",
  "memory_unlink_org_work",
  "memory_link_work_space",
  "memory_unlink_work_space",
  "memory_create_note",
  "memory_create_meeting",
] as const;

export type MemoryMutatingSlug = (typeof MEMORY_MUTATING_SLUGS)[number];

const MEMORY_MUTATING_SET = new Set<string>(MEMORY_MUTATING_SLUGS);

export function isMemoryMutatingSlug(slug: string): boolean {
  return MEMORY_MUTATING_SET.has(slug);
}

export function validateMemoryMonopoly(
  actSlugs: string[],
  _section: PlaybookSection,
): { ok: true } | { ok: false; violations: string[] } {
  const violations = actSlugs.filter((slug) => MEMORY_MUTATING_SET.has(slug));

  if (violations.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    violations,
  };
}
