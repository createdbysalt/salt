/**
 * Work-name helpers shared between server and client bundles.
 *
 * Pure module — no imports. (The sibling `evidence/name-work.ts` pulls in
 * the LLM client, so client components must take this path instead.)
 */

/**
 * True when a work name is the counterparty-anchored placeholder auto-create
 * sets ("Kainos Labs — Project") — a convention Salt invented to keep the
 * record identifiable, not a name anyone stated. Placeholders must never be
 * presented with a confidence number: there is nothing to be confident
 * about. A contract/proposal read (content-analysis) replaces them.
 */
export function isPlaceholderWorkName(
  name: string | null | undefined,
): boolean {
  if (!name) return false;
  return / — Project$/i.test(name.trim());
}
