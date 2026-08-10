/**
 * Memory → Customize — corrections routing (Phase M5).
 *
 * The corrections door ("Want me to remember this?") and the Ask Salt
 * door share one classifier so a correction can never land somewhere the
 * mechanism doesn't back:
 *
 * - Entity-expressible hard exclusions ("never let in anything from
 *   @spammy.com") compile to a workspace deny rule — the Sources surface
 *   owns that mechanism, so the route points there.
 * - Generalizations ("never treat my accountant as a client") have no
 *   parseable target; they become Memory customization entries
 *   (`source: correction` / `ask_salt`) in the best-guess record-type doc.
 *
 * Pure module: no server-only imports.
 */

import {
  detectHardExclusion,
  type HardExclusion,
} from "./hard-exclusion";
import type { MemoryCustomizeEntityType } from "./default-guidance";

export type CorrectionRoute =
  | { kind: "sources_rule"; exclusion: HardExclusion }
  | { kind: "memory_customization"; entityType: MemoryCustomizeEntityType };

// First match wins — order specific → general so "company" doesn't lose
// to a stray "client" later in the sentence.
const ENTITY_HINTS: readonly (readonly [
  RegExp,
  MemoryCustomizeEntityType,
])[] = [
  [/\b(?:meetings?|events?|calls?|appointments?|invites?)\b/i, "meeting"],
  [/\b(?:files?|documents?|docs?|folders?|invoices?|pdfs?)\b/i, "resource"],
  [/\b(?:projects?|work|engagements?|gigs?|contracts?)\b/i, "work"],
  [
    /\b(?:compan(?:y|ies)|orgs?(?:anizations?)?|vendors?|agenc(?:y|ies)|firms?)\b/i,
    "org",
  ],
  [
    /\b(?:person|people|clients?|customers?|contacts?|leads?|accountants?|assistants?)\b/i,
    "person",
  ],
];

/**
 * Best-guess record type for a generalization. Defaults to "person" —
 * the most common correction subject — never guesses wildly.
 */
export function guessCustomizeEntityType(
  text: string,
): MemoryCustomizeEntityType {
  for (const [pattern, type] of ENTITY_HINTS) {
    if (pattern.test(text)) return type;
  }
  return "person";
}

/**
 * Route a correction/customization to the surface that can enforce it.
 */
export function routeCorrection(text: string): CorrectionRoute {
  const exclusion = detectHardExclusion(text);
  if (exclusion) return { kind: "sources_rule", exclusion };
  return {
    kind: "memory_customization",
    entityType: guessCustomizeEntityType(text),
  };
}
