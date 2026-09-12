/**
 * Work-name helpers shared between server and client bundles.
 *
 * Pure module — no imports. (The sibling `evidence/name-work.ts` pulls in
 * the LLM client, so client components must take this path instead.)
 */

/**
 * True when a work name is a placeholder rather than a deliverable:
 *
 * - the counterparty-anchored placeholder auto-create sets ("Kainos Labs —
 *   Project") — a convention Salt invented to keep the record identifiable,
 *   not a name anyone stated; or
 * - a "{known entity} Project" generic ("Good Company Project") when the
 *   entity names are supplied — says who, not what.
 *
 * Placeholders must never be presented with a confidence number: there is
 * nothing to be confident about. A contract/proposal read (content-analysis)
 * or the work-synthesis pass replaces them.
 */
export function isPlaceholderWorkName(
  name: string | null | undefined,
  knownEntityNames: string[] = [],
): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (/ — Project$/i.test(trimmed)) return true;
  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
  if (normalized === "project") return true;
  const withoutProject = normalized.replace(/\s+project$/, "");
  if (withoutProject !== normalized) {
    if (!withoutProject) return true;
    return knownEntityNames.some(
      (entry) =>
        entry.trim().toLowerCase().replace(/\s+/g, " ") === withoutProject,
    );
  }
  return false;
}
