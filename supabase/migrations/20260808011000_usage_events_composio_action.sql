-- ============================================================================
-- Usage Events: `composio_action` event type (Sources plan 3.1)
-- ============================================================================
--
-- Gate-level Composio COGS recording (commit 24c6634b) writes one
-- `composio_action` row per successful non-play tool call. The event-type
-- CHECK constraint (20260807232000) predates it, so without this migration
-- every such write fails the constraint and is swallowed by the non-fatal
-- ledger — metering silently dead, which is exactly the "cost stays
-- invisible" failure the recording exists to prevent. Caught by live
-- verification against staging, 2026-08-08.
--
-- Always `billable = false`: pure COGS visibility, never an invoice line.
-- The TS side of this list is USAGE_EVENT_TYPES in app/_lib/usage/types.ts;
-- a unit test asserts the two stay identical, so the next type added without
-- a migration fails CI instead of failing silently.

ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_event_type_check;

ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_type_check
  CHECK (event_type IN (
    'play_executed',
    'action_sent',
    'ask_salt_query',
    'capture_ingested',
    'capture_processed',
    'storage_delta',
    'llm_call',
    'composio_trigger_event',
    'composio_action'
  ));
