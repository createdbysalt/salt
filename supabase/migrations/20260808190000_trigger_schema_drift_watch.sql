-- ============================================================================
-- Sources plan 5.8: trigger-schema drift watch
--
-- Catalog sync already mirrors connector_trigger_types.payload_schema /
-- config_schema from Composio, but never COMPARED them — a silent upstream
-- schema change would leave capture normalizers parsing a shape that no
-- longer matches reality (exactly how broken normalizers went unnoticed
-- before webhook_outcome events existed).
--
-- The sync now emits kind='trigger_schema_changed' (with
-- detail.enabledForCapture + detail.changedFields) when a synced trigger's
-- payload or config schema drifts, and marks the row sync_status='changed'.
-- This migration adds the new kind to the CHECK constraint.
--
-- Health query example:
--   SELECT subject_slug, detail, created_at
--   FROM connector_sync_events
--   WHERE kind = 'trigger_schema_changed'
--     AND detail->>'enabledForCapture' = 'true'
--     AND acknowledged_at IS NULL
--   ORDER BY created_at DESC;
-- ============================================================================

ALTER TABLE public.connector_sync_events
  DROP CONSTRAINT connector_sync_events_kind_check;

ALTER TABLE public.connector_sync_events
  ADD CONSTRAINT connector_sync_events_kind_check CHECK (kind IN (
    'toolkit_added', 'toolkit_removed',
    'tool_added', 'tool_removed', 'tool_schema_changed',
    'trigger_added', 'trigger_removed', 'trigger_schema_changed',
    'classification_disabled', 'sync_failed',
    'webhook_outcome', 'capture_budget_exceeded'
  ));
