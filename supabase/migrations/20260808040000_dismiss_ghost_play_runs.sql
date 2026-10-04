-- Plays canon Phase 2: dismiss ghost play_runs rows.
--
-- Founder-authorized 2026-08-08; applied to staging (nbapomfgcsrsqdvenqmf)
-- the same day — production (ejuobmbpwbinmfqyxhrn) picks it up at the next
-- release push. The ghost writers themselves were deleted the same day
-- (founder killed the transition flag — eviction is the only behavior), so
-- once the code deploys no new ghost rows can accumulate.
--
-- These rows are queue ghosts: intake proposals ('memory-records'),
-- client-risk, and route-signal play runs fail card validation
-- (validatePlayCard: profile body requires field) so users can neither see
-- nor act on them — but listQueuedPlayRuns selects state IN ('queued',
-- 'draft') oldest-first with LIMIT 50, so the zombies permanently occupy
-- the fetch window and starve real plays out of the queue.
--
-- UPDATE, never DELETE: usage_events.play_run_id references play_runs
-- (ON DELETE SET NULL) and the ledger reconstructs idempotency keys from
-- run ids — deleting rows would orphan billing attribution.

UPDATE public.play_runs
SET
  state = 'dismissed',
  dismissed_at = NOW(),
  updated_at = NOW()
WHERE
  state IN ('queued', 'draft')
  AND source_context->>'playbook_slug' IN (
    'memory-records',
    'client-risk',
    'route-signal'
  );

-- Report what was cleaned (visible in db push output).
DO $$
DECLARE
  remaining integer;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM public.play_runs
  WHERE state IN ('queued', 'draft')
    AND source_context->>'playbook_slug' IN
      ('memory-records', 'client-risk', 'route-signal');

  IF remaining > 0 THEN
    RAISE EXCEPTION 'ghost play_runs cleanup incomplete: % rows remain', remaining;
  END IF;
END $$;
