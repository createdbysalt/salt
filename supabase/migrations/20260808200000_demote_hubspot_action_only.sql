-- ============================================================================
-- Sources plan 5.7: HubSpot demoted to action-only (owner decision 2026-08-08)
--
-- HubSpot's Composio triggers (HUBSPOT_CONTACT_CREATED_TRIGGER,
-- HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER) require each user's own HubSpot
-- developer-app credentials to deliver webhooks — capture cannot work with
-- Salt's shared OAuth app. Both trigger types are already
-- enabled_for_capture=false. Decision: keep HubSpot action-only (actions +
-- Ask Salt keep working); revisit developer-app onboarding or polling
-- backfill later.
--
-- Two truths being encoded:
--   1. capture_category = NULL — without this, adapterForToolkit('hubspot')
--      still resolved the CRM adapter, so the capture toggle stayed reachable
--      and enableCaptureTriggers would fall back to adapter.triggerSlugs
--      (the DB-enabled list is empty) and subscribe triggers that can never
--      deliver. NULL makes "no capture" the computed state everywhere
--      (toggle hides via getCaptureCategoryMap, setCaptureState refuses).
--   2. capture_enabled = false on existing connections — staging had one
--      HubSpot connection with capture_enabled=true and ZERO trigger
--      instances (silently dead). Nothing is ingesting; the flag was a lie.
--
-- The CRM adapter's hand-written HubSpot normalizer stays in code (dormant)
-- so re-enabling later is a pure data change.
-- ============================================================================

UPDATE public.connector_overrides
SET capture_category = NULL
WHERE provider_key = 'hubspot';

UPDATE public.workspace_integrations
SET capture_enabled = false
WHERE provider = 'hubspot'
  AND capture_enabled = true;
