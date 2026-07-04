-- ============================================================================
-- DROP BRIDGE-ERA TABLES (schema-modernization, gated drop list)
-- ============================================================================
--
-- Staging-first policy decided 2026-07-02: all schema work lands on the
-- CLI-linked project; production cuts over later from the migration set.
-- Every table below has ZERO app-code references (verified by import/grep
-- sweeps after the Phase A/B retirements) and its rows were exported to a
-- local backup before this ran (all empty except one client_users test row).
--
-- NOT dropped here:
--   - clients            (Phase B Batch 4: one-release guard first)
--   - project_retainers  (Phase G.1: fold into work columns first)
--   - meeting_types      (live Cal.com sync storage; renames later)
--   - teams              (live Memory surface)
-- ============================================================================

-- Bridge client-portal features
DROP TABLE IF EXISTS public.client_activity_events CASCADE;
DROP TABLE IF EXISTS public.client_announcements CASCADE;
DROP TABLE IF EXISTS public.client_intakes CASCADE;
DROP TABLE IF EXISTS public.intake_templates CASCADE;
DROP TABLE IF EXISTS public.client_knowledge_base CASCADE;
DROP TABLE IF EXISTS public.client_users CASCADE;

-- Bridge portal billing (Stripe Connect era; portal_invoices last-but-one,
-- portal_portals last — children first)
DROP TABLE IF EXISTS public.portal_invoice_payments CASCADE;
DROP TABLE IF EXISTS public.portal_invoice_access_tokens CASCADE;
DROP TABLE IF EXISTS public.portal_subscription_invoices CASCADE;
DROP TABLE IF EXISTS public.portal_client_subscriptions CASCADE;
DROP TABLE IF EXISTS public.portal_invoices CASCADE;
DROP TABLE IF EXISTS public.portal_portals CASCADE;

-- Dead feature tables
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.knowledge_items CASCADE;
DROP TABLE IF EXISTS public.discovery_cache CASCADE;

-- Unfinished-consolidation duplicates (live twins: organizations,
-- workspace_services, workspace_calendar_connections)
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.service_items CASCADE;
DROP TABLE IF EXISTS public.calendar_connections CASCADE;

-- Materialized view over retired portal/engagement data (service_role-only
-- since the 2026-06 hardening; its sources are gone)
DROP MATERIALIZED VIEW IF EXISTS public.client_engagement_stats CASCADE;

-- ============================================================================
-- DONE: 19 Bridge-era objects removed
-- ============================================================================
