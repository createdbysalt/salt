-- ============================================================================
-- Usage Events: `composio_trigger_event` event type (Sources plan Phase 0.7)
-- ============================================================================
--
-- Composio bills trigger events at delivery (egress) — $0.001/event under the
-- Aug 15 2026 pricing. Until now none of this spend reached the ledger, so the
-- margin monitor was blind to it. Rows are recorded at webhook ingress,
-- idempotent on the Standard-Webhooks delivery id.
--
-- Always `billable = false`: pure COGS visibility, never a customer invoice
-- line. Volume is one row per delivered trigger event; the partial index on
-- `billable = true` keeps bundle counting unaffected, and reads run through
-- idx_usage_events_type_period (20260806120000).

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
    'composio_trigger_event'
  ));
