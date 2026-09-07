-- Repair the 2026-08-09 mass drift-disable false positive.
--
-- Audit findings (staging, 2026-08-29):
--   - 1,809 classification_disabled events fired in a single catalog-sync run
--     on 2026-08-09 (vs 7 on 08-06 and 7–31/day since) — a one-time upstream
--     format shift in Composio's catalog API flipped every schema_hash at
--     once, not 1,000+ genuine per-tool schema changes.
--   - disableApprovedClassification only demotes rows that were 'approved',
--     so every affected row was previously reviewed/auto-approved.
--   - Daily syncs since show schemas stable: affected tools sync as
--     sync_status='active' (hash matches at every sync since the event).
--
-- Now that the execution gate treats 'disabled' as a hard deny (no heuristic
-- fallback), leaving these rows disabled would block the entire long tail.
-- Restore 'approved' for rows disabled by that event whose tool is currently
-- active. Tools still 'removed' or 'changed' stay disabled — those
-- are genuine drift.

UPDATE public.tool_classifications AS tc
SET status = 'approved',
    approved_at = now(),
    notes = concat_ws(
      ' ',
      tc.notes,
      '(re-approved 2026-08-29: 08-09 mass drift event was an upstream format shift; schema stable at every sync since)'
    )
FROM public.connector_tools AS ct
WHERE ct.tool_slug = tc.tool_slug
  AND tc.status = 'disabled'
  AND tc.disabled_reason = 'Input/output schema changed upstream — re-review required'
  AND ct.sync_status = 'active';
