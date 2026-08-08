-- ============================================================================
-- Sources plan 3.2: upstream filter audit — disable un-subscribable triggers
--
-- Live config-schema audit (2026-08-08) of every enabled_for_capture slug
-- found three whose config schemas have REQUIRED fields Salt cannot supply
-- at subscribe time:
--
--   GOOGLESLIDES_SLIDE_ADDED_TRIGGER   requires presentation_id (per-user)
--   HUBSPOT_CONTACT_CREATED_TRIGGER    requires app_id + developer_api_key
--   HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER requires app_id + developer_api_key
--
-- With enabled_for_capture = true, enableCaptureTriggers attempts these,
-- every rung of the fallback ladder 400s on the missing required config,
-- and the whole enable rolls back — capture cannot be turned ON for those
-- connectors at all. They stay disabled until per-user trigger config
-- infrastructure exists (Sources plan 4.2 upsert wrapper + 4.5 detail-pane
-- scoping).
--
-- The audit's other findings need no migration: the only universally-safe
-- static filters are already seeded (Gmail category query, Slack bot
-- filter, 20260807000000); every remaining filterable field (calendarId,
-- Drive folder_id/query, Docs/Sheets query, Notion page/data-source ids,
-- Slack channel_id) is per-user scoping owned by plan 4.5, and
-- Outlook/Stripe/Slack-DM schemas expose no filters at all.
--
-- enabled_for_capture is Salt-owned: the nightly catalog sync upserts only
-- synced columns (name/description/delivery/schemas/status), so this
-- survives re-sync.
-- ============================================================================

UPDATE public.connector_trigger_types
SET enabled_for_capture = false
WHERE trigger_slug IN (
  'GOOGLESLIDES_SLIDE_ADDED_TRIGGER',
  'HUBSPOT_CONTACT_CREATED_TRIGGER',
  'HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER'
);
