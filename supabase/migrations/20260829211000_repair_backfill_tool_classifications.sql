-- ============================================================================
-- REPAIR: backfill read-tool classifications drifted from the seed
-- ============================================================================
--
-- 20260806100000 seeded these six capture-backfill read tools as
-- approved/read, but with ON CONFLICT DO NOTHING. Reality on 2026-08-29:
--
--   - Staging: all six rows are status='disabled' — catalog-sync demoted
--     them on 2026-08-09 ("Input/output schema changed upstream") during the
--     Composio toolkit rework settling, and nobody re-approved. The sync has
--     since recorded the new schemas, so re-approval sticks.
--   - Prod: four are disabled the same way; QUICKBOOKS_CUSTOMER_BALANCE_DETAIL
--     and DROPBOX_LIST_FILES_IN_FOLDER pre-existed as 'unclassified' rows, so
--     the seed's ON CONFLICT DO NOTHING never landed at all.
--
-- Effect: getApprovedToolClassification only honors status='approved', so
-- every one of these falls back to the slug heuristic, which classifies
-- QUICKBOOKS_CUSTOMER_BALANCE_DETAIL (no read-pattern word in the slug) as
-- mutating — and unattended backfills fail closed with "is mutating and
-- cannot run in an unattended context". The reconciliation cron has been
-- silently skipping these providers on both environments since 2026-08-09.
--
-- Re-review (the disabled_reason asked for one): all six are read-class
-- report/list endpoints, live-verified against the Composio API on
-- 2026-08-06 (see the original seed's header); the executor's input schema
-- for each is passthrough. Re-approving as read.
--
-- Rollback:
--   UPDATE public.tool_classifications
--     SET status = 'disabled', disabled_reason = 'rollback of 20260829211000'
--     WHERE tool_slug IN (
--       'CALENDLY_GET_CURRENT_USER','CALENDLY_LIST_EVENTS',
--       'CALENDLY_LIST_EVENT_INVITEES','DROPBOX_LIST_FILES_IN_FOLDER',
--       'QUICKBOOKS_CUSTOMER_BALANCE_DETAIL','CAL_FETCH_ALL_BOOKINGS'
--     );
-- ============================================================================

UPDATE public.tool_classifications
SET
  status = 'approved',
  risk = 'read',
  requires_human_confirmation = false,
  disabled_reason = NULL,
  source = 'seed',
  approved_at = now(),
  notes = 'Capture backfill read tool; re-approved 2026-08-29 after the 2026-08-09 upstream schema-change demotion (schemas since recorded by catalog-sync)'
WHERE tool_slug IN (
  'CALENDLY_GET_CURRENT_USER',
  'CALENDLY_LIST_EVENTS',
  'CALENDLY_LIST_EVENT_INVITEES',
  'DROPBOX_LIST_FILES_IN_FOLDER',
  'QUICKBOOKS_CUSTOMER_BALANCE_DETAIL',
  'CAL_FETCH_ALL_BOOKINGS'
);

-- Post-push assertion (the ledger has lied before).
DO $$
DECLARE
  not_approved INT;
BEGIN
  SELECT count(*) INTO not_approved
  FROM public.tool_classifications
  WHERE tool_slug IN (
    'CALENDLY_GET_CURRENT_USER',
    'CALENDLY_LIST_EVENTS',
    'CALENDLY_LIST_EVENT_INVITEES',
    'DROPBOX_LIST_FILES_IN_FOLDER',
    'QUICKBOOKS_CUSTOMER_BALANCE_DETAIL',
    'CAL_FETCH_ALL_BOOKINGS'
  )
  AND (status IS DISTINCT FROM 'approved' OR risk IS DISTINCT FROM 'read');

  IF not_approved > 0 THEN
    RAISE EXCEPTION '% backfill tool classifications still not approved/read', not_approved;
  END IF;
END $$;
