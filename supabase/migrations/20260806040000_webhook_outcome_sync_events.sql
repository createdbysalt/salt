-- ============================================================================
-- Webhook ingress observability (capture pipeline repair, Phase 0).
--
-- Every non-success outcome at the Composio webhook ingress is persisted to
-- connector_sync_events as kind='webhook_outcome' (trigger slug, connected
-- account id, outcome, payload key sample — keys only, no values, for
-- privacy). Previously these outcomes acked HTTP 200 and vanished, which is
-- how broken normalizers went unnoticed for weeks.
--
-- Health query example:
--   SELECT subject_slug, detail->>'outcome' AS outcome, count(*)
--   FROM connector_sync_events
--   WHERE kind = 'webhook_outcome' AND created_at > now() - interval '24 hours'
--   GROUP BY 1, 2 ORDER BY 1, 3 DESC;
-- ============================================================================

ALTER TABLE public.connector_sync_events
  DROP CONSTRAINT connector_sync_events_kind_check;

ALTER TABLE public.connector_sync_events
  ADD CONSTRAINT connector_sync_events_kind_check CHECK (kind IN (
    'toolkit_added', 'toolkit_removed',
    'tool_added', 'tool_removed', 'tool_schema_changed',
    'trigger_added', 'trigger_removed',
    'classification_disabled', 'sync_failed',
    'webhook_outcome'
  ));

-- Webhook health queries filter by kind + recency.
CREATE INDEX IF NOT EXISTS idx_connector_sync_events_kind_created
  ON public.connector_sync_events (kind, created_at DESC);
