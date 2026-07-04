/**
 * Confidence scale adapters (keeper-field-contracts Phase 6.2).
 *
 * The app-layer canonical confidence scale is 0–100 (what plays, findings,
 * capture, provenance, and entity_links store). Two legacy columns store a
 * 0–1 unit interval instead — work_blockers.confidence (NUMERIC(3,2)) and
 * entity_tag_assignments.confidence. Convert AT THE BOUNDARY with these
 * adapters instead of sprinkling `* 100` conversions; the columns themselves
 * stay 0–1 until their own migrations land.
 */

/** 0–1 column value → canonical 0–100 (rounded). */
export function fromUnitInterval(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

/** Canonical 0–100 → 0–1 column value (two decimals, NUMERIC(3,2)-safe). */
export function toUnitInterval(percent: number | null | undefined): number | null {
  if (percent == null || Number.isNaN(percent)) return null;
  return Math.round(Math.min(100, Math.max(0, percent))) / 100;
}
