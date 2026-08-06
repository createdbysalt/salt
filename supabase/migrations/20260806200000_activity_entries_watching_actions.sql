-- Allow the Activity ledger to record the newer action states the UI already
-- maps into Salt Acted / You Decided / Watching buckets.

ALTER TABLE public.activity_entries
  DROP CONSTRAINT IF EXISTS activity_entries_action_check;

ALTER TABLE public.activity_entries
  ADD CONSTRAINT activity_entries_action_check
  CHECK (
    action IN (
      'created',
      'approved',
      'dismissed',
      'scheduled',
      'edited',
      'ran',
      'logged',
      'acknowledged',
      'routed',
      'auto_applied',
      'accumulated',
      'hold_for_threshold',
      'resource_activity',
      'resumed'
    )
  );
