-- ============================================================================
-- DROP UNMANAGED RELIC TABLES (environment convergence, final parity)
-- ============================================================================
--
-- Five tables existed only on the production project, created by hand in
-- the dashboard before the migration discipline existed and never present
-- in any migration file: Bridge-era analytics (bridge_activity_log,
-- bridge_page_views, bridge_sessions) and the retired marketing pipeline
-- experiment (pipeline_runs, youtube_video_stats). Zero app references,
-- zero rows (verified 2026-07-03; export in .backups/pre-drop-relic-tables-
-- prod.sql). Dropping them makes production and staging object sets
-- IDENTICAL. Founder-approved 2026-07-03. No-op on staging and fresh DBs.
-- ============================================================================

DROP TABLE IF EXISTS public.bridge_activity_log CASCADE;
DROP TABLE IF EXISTS public.bridge_page_views CASCADE;
DROP TABLE IF EXISTS public.bridge_sessions CASCADE;
DROP TABLE IF EXISTS public.pipeline_runs CASCADE;
DROP TABLE IF EXISTS public.youtube_video_stats CASCADE;
