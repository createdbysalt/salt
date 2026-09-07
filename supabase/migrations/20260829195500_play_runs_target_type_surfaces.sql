-- ============================================================================
-- FIX: play_runs.target_type missing signal-entity surfaces
-- ============================================================================
--
-- The v2 executor stamps play_runs.target_type from the signal's entity
-- surface (SignalTriggerContext.entitySurface: person | organization | work |
-- billing | meeting | resource | workspace). The CHECK constraint from
-- 20260609234000 predates those surfaces and rejects 'billing', 'resource',
-- and 'workspace' — so signal-triggered runs for those surfaces failed the
-- play_runs INSERT silently (the executor swallowed the error and reported
-- success with zero outputs). Found via payment-received on
-- billing_payment_matched, 2026-08-29.
--
-- Existing values are preserved; 'billing', 'resource', 'workspace' added.
--
-- Rollback:
--   ALTER TABLE public.play_runs DROP CONSTRAINT play_runs_target_type_check;
--   ALTER TABLE public.play_runs ADD CONSTRAINT play_runs_target_type_check
--     CHECK (target_type IS NULL OR target_type IN (
--       'person','organization','project','work','client','space',
--       'opportunity_gap','conversation','meeting','file','custom'));
--   (only safe once no rows carry the new values)
-- ============================================================================

ALTER TABLE public.play_runs
  DROP CONSTRAINT IF EXISTS play_runs_target_type_check;

ALTER TABLE public.play_runs
  ADD CONSTRAINT play_runs_target_type_check
  CHECK (
    target_type IS NULL OR target_type IN (
      'person',
      'organization',
      'project',
      'work',
      'client',
      'space',
      'opportunity_gap',
      'conversation',
      'meeting',
      'file',
      'custom',
      'billing',
      'resource',
      'workspace'
    )
  );

-- Post-push assertion: a billing-targeted row must be insertable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'play_runs_target_type_check'
      AND conrelid = 'public.play_runs'::regclass
  ) THEN
    RAISE EXCEPTION 'play_runs_target_type_check missing after migration';
  END IF;
END $$;
