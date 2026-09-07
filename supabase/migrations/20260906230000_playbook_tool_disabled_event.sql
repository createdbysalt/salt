-- ============================================================================
-- playbook_tool_disabled sync event kind (connector trust alignment, Phase 3).
--
-- When catalog-sync drift-disables an approved classification, the sync job
-- now also records which repo playbooks allowlist the tool — the feedback
-- loop that was missing on 2026-09-03 when GMAIL_SEND_EMAIL was disabled and
-- the Invoice Reminder playbook broke invisibly until a founder-approved send
-- failed at the gate.
--
-- Health query example:
--   SELECT subject_slug, detail->'playbooks', created_at
--   FROM connector_sync_events
--   WHERE kind = 'playbook_tool_disabled' AND acknowledged_at IS NULL
--   ORDER BY created_at DESC;
-- ============================================================================

ALTER TABLE public.connector_sync_events
  DROP CONSTRAINT connector_sync_events_kind_check;

ALTER TABLE public.connector_sync_events
  ADD CONSTRAINT connector_sync_events_kind_check CHECK (kind IN (
    'toolkit_added', 'toolkit_removed',
    'tool_added', 'tool_removed', 'tool_schema_changed',
    'trigger_added', 'trigger_removed', 'trigger_schema_changed',
    'classification_disabled', 'playbook_tool_disabled', 'sync_failed',
    'webhook_outcome', 'capture_budget_exceeded'
  ));
