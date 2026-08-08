/**
 * Sender-scoped Gmail trigger query (Sources plan 4.3 experiment).
 *
 * The current capture trigger fires on `{label:inbox label:sent} -category:…`
 * — every non-noise message delivers a (billed) webhook. A sender-scoped
 * query (`from:(a OR b OR …)` built from Memory people) would deliver only
 * known-sender events, pushing discovery of new senders to Lane B backfills.
 *
 * Safety invariant: an EMPTY sender list must produce NO query. Subscribing
 * with an empty/omitted query would match everything — the exact unfiltered
 * billing leak the filter exists to prevent. Callers check for `[]` and skip
 * the upsert.
 */

/** Practical Gmail search-query length bound, verified live in the 4.3 experiment. */
export const DEFAULT_MAX_QUERY_LENGTH = 1400;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lowercase, trim, drop blanks/invalids, dedupe. */
export function normalizeSenderEmails(emails: Iterable<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const email of emails) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !EMAIL_PATTERN.test(normalized)) continue;
    seen.add(normalized);
  }
  return [...seen];
}

/**
 * `from:(a@x.com OR b@y.com)` — Gmail OR-group syntax. Returns an empty
 * string for an empty list; callers MUST treat that as "do not subscribe".
 */
export function buildSenderScopedQuery(emails: string[]): string {
  if (emails.length === 0) return "";
  return `from:(${emails.join(" OR ")})`;
}

/**
 * Split a sender list into queries that each stay within maxQueryLength.
 * Trigger configs are per-slug, so an oversized Memory set means rotating
 * the scope across reconciliation runs (or falling back to the category
 * query) — the chunk bound makes the trade-off explicit and measurable.
 */
export function chunkSenderQueries(
  emails: string[],
  maxQueryLength: number = DEFAULT_MAX_QUERY_LENGTH
): string[] {
  const normalized = normalizeSenderEmails(emails);
  if (normalized.length === 0) return [];

  const chunks: string[] = [];
  let current: string[] = [];

  for (const email of normalized) {
    const candidate = [...current, email];
    if (buildSenderScopedQuery(candidate).length > maxQueryLength) {
      // A single email that alone exceeds the bound is skipped rather than
      // subscribed unfiltered-by-accident.
      if (current.length === 0) continue;
      chunks.push(buildSenderScopedQuery(current));
      current = [email];
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) chunks.push(buildSenderScopedQuery(current));

  return chunks;
}
