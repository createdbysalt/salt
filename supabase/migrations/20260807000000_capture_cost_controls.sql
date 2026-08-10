-- ============================================================================
-- Migration: Capture cost controls (capture-pipeline repair, Phase 6)
--
-- 1. connector_trigger_types.capture_trigger_config — Salt-curated per-trigger
--    config pushed upstream into Composio at subscription time, so filtered
--    events never fire a webhook at all (every webhook is a paid Vercel
--    invocation; today all gating happens after it). The nightly catalog
--    sync upserts only synced columns (slug/name/description/delivery/
--    payload_schema/config_schema/sync_status), so this column survives
--    syncs — same pattern as enabled_for_capture.
--
--    Seeded values (verified against live trigger config schemas in
--    app/_features/capture/adapters/__fixtures__/composio-trigger-schemas.json):
--    - Gmail: query excludes promo/social/updates/forums categories, mirroring
--      the pre-ingest gate's PROMOTIONAL_LABELS drops — but upstream, so the
--      events never fire. {label:inbox label:sent} keeps outbound mail flowing
--      (reply-loop learning) while category exclusions filter inbound noise.
--    - Slack: is_bot_message=false — bot messages never fire the webhook
--      (the communication adapter already declines them after the fact).
--    - Outlook: config schema is empty ("No config needed") — filtering stays
--      in code (pre-enrichment gates in the webhook route).
--
-- 2. connector_sync_events kind 'capture_budget_exceeded' — recorded (throttled)
--    when a workspace crosses its daily capture budget, so the cap is visible
--    in the same health surface as webhook outcomes:
--      SELECT * FROM connector_sync_events
--      WHERE kind = 'capture_budget_exceeded'
--        AND created_at > now() - interval '24 hours';
-- ============================================================================

ALTER TABLE public.connector_trigger_types
ADD COLUMN IF NOT EXISTS capture_trigger_config jsonb;

COMMENT ON COLUMN public.connector_trigger_types.capture_trigger_config IS
  'Salt-curated triggerConfig passed to Composio when subscribing for capture (upstream filtering). Never touched by catalog sync.';

UPDATE public.connector_trigger_types
SET capture_trigger_config = '{"query": "{label:inbox label:sent} -category:promotions -category:social -category:updates -category:forums"}'::jsonb
WHERE trigger_slug = 'GMAIL_NEW_GMAIL_MESSAGE';

UPDATE public.connector_trigger_types
SET capture_trigger_config = '{"is_bot_message": false}'::jsonb
WHERE trigger_slug = 'SLACK_CHANNEL_MESSAGE_RECEIVED';

ALTER TABLE public.connector_sync_events
  DROP CONSTRAINT connector_sync_events_kind_check;

ALTER TABLE public.connector_sync_events
  ADD CONSTRAINT connector_sync_events_kind_check CHECK (kind IN (
    'toolkit_added', 'toolkit_removed',
    'tool_added', 'tool_removed', 'tool_schema_changed',
    'trigger_added', 'trigger_removed',
    'classification_disabled', 'sync_failed',
    'webhook_outcome', 'capture_budget_exceeded'
  ));
