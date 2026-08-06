/**
 * Shared payload parsing helpers for capture normalizers (capture pipeline
 * repair, Phase 1).
 *
 * Real Composio trigger payloads vary in casing (camelCase vs snake_case)
 * and nesting (Google wraps the entity in `document` / `spreadsheet` /
 * `slide` / `file`; Stripe wraps the event in `body`). These helpers let
 * every normalizer try the known spellings and one level of nesting before
 * giving up — a `null` from `normalize()` acks the webhook as `declined`,
 * so being permissive here is what keeps captures flowing.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/** First non-empty string among the given keys (list both spellings). */
export function pickString(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value !== null) return value;
  }
  return null;
}

/**
 * Unwrap one level of nesting: return the first record found under the
 * given wrapper keys, or the record itself when no wrapper matches.
 */
export function unwrapRecord(
  record: Record<string, unknown>,
  wrapperKeys: readonly string[],
): Record<string, unknown> {
  for (const key of wrapperKeys) {
    const nested = record[key];
    if (isRecord(nested)) return nested;
  }
  return record;
}
