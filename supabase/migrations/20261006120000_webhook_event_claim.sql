-- ============================================================================
-- BILLING: make webhook idempotency a claim, not a check
-- ============================================================================
-- The handler used to ask "have I seen this event?", run the handlers, and
-- record the event last. Two redeliveries of the same event that arrive
-- within the processing window both pass the check, so both run. The unique
-- index caught the second *write*, but only after the side effects had
-- already happened, and the insert error was never read.
--
-- The fix is to insert first and treat the unique violation as the signal,
-- exactly as `usage_events` does. That turns the row into a claim: whoever
-- inserts it owns the event. `claimed_at` is what makes a stuck claim
-- recoverable without letting two workers reclaim it at once -- the reclaim
-- is a compare-and-swap on this column, so the first writer moves it forward
-- and every racing writer's WHERE clause stops matching.
-- ============================================================================

ALTER TABLE public.billing_webhook_events
  ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone
    DEFAULT timezone('utc'::text, now());

-- Existing rows predate claims. Treat them as claimed when they were created:
-- anything already processed is terminal, and anything unprocessed is far
-- older than the stale window, so it becomes reclaimable immediately.
UPDATE public.billing_webhook_events
   SET claimed_at = created_at
 WHERE claimed_at IS NULL;

ALTER TABLE public.billing_webhook_events
  ALTER COLUMN claimed_at SET NOT NULL;

-- The reclaim path scans for unprocessed claims older than the stale window.
CREATE INDEX IF NOT EXISTS idx_webhook_events_stale_claims
  ON public.billing_webhook_events (claimed_at)
  WHERE processed_at IS NULL;

COMMENT ON COLUMN public.billing_webhook_events.claimed_at IS
  'When a worker last took ownership of this event. The row is inserted before the handlers run, so its existence is the idempotency claim; this column is the compare-and-swap token that lets exactly one worker reclaim a stuck event.';

COMMENT ON TABLE public.billing_webhook_events IS
  'Stripe webhook event log. Inserted BEFORE processing: the row is a claim on the event, and the unique index on stripe_event_id is what makes delivery idempotent. processed_at is set after the handlers succeed.';
