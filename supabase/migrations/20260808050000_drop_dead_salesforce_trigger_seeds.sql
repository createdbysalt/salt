-- Migration: Drop dead Salesforce trigger seeds
-- Purpose: 20260713280000 set enabled_for_capture = true for four SALESFORCE_*
--          trigger slugs that 404 upstream in Composio (repair-plan Phase 2
--          finding — they can never be subscribed or delivered). The nightly
--          catalog sync cannot recreate them (they 404), so deleting the rows
--          is permanent. Salesforce stays in the catalog as catalog_only.
--
-- Rollback: none needed — the rows are unreachable dead config; if Composio
-- ever ships these slugs, the nightly connector_catalog sync re-creates them
-- with enabled_for_capture = false (the safe default).

DELETE FROM public.connector_trigger_types
WHERE trigger_slug IN (
  'SALESFORCE_ACCOUNT_CREATED_OR_UPDATED_TRIGGER',
  'SALESFORCE_CONTACT_UPDATED_TRIGGER',
  'SALESFORCE_LEAD_CREATED_OR_UPDATED_TRIGGER',
  'SALESFORCE_OPPORTUNITY_UPDATED_TRIGGER'
);
