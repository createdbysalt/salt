-- ============================================================================
-- DROP THE clients TABLE + EVERY client_id COLUMN (bridge retirement, final)
-- ============================================================================
--
-- Founder authorization 2026-07-03: the Bridge era is fully deleted. This is
-- schema-modernization Phase B-Batch4 without the one-release access-log
-- guard: the app is already clients-free (all reads ported to
-- person_id/organization_id, backfilled by 20260702130000; all writers
-- removed; grep-verified zero code references).
--
-- Pre-drop dependency sweep (per the auto_activate_client_user lesson):
-- - is_client_user_of_client() + client_users_view_projects policy dropped
--   in 20260703160000
-- - current handle_new_user() has no clients reference (last replaced
--   20260627150000)
-- - no live views reference clients
--
-- Column drops use CASCADE so any straggler bridge-era policy or index that
-- depends on a client_id column dies with it.
--
-- NOT dropped here (dead but separate decisions, not Bridge per se):
-- - project_retainers (schema-modernization G.1 fold pending)
-- - teams (Memory surface placeholder)
-- - meeting_types (live Cal.com sync storage)
-- ============================================================================

-- 1. client_id columns on live tables
ALTER TABLE public.projects DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.client_meetings DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.project_files DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.client_emails DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.conversations DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.onboarding_checklists DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.intelligence_events DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.intelligence_queue DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.project_retainers DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.retainer_time_entries DROP COLUMN IF EXISTS client_id CASCADE;

-- 2. Migration mapping columns (modern -> legacy pointers, now meaningless)
ALTER TABLE public.people DROP COLUMN IF EXISTS migrated_from_client_id CASCADE;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS migrated_from_client_id CASCADE;

-- 3. The table itself
DROP TABLE IF EXISTS public.clients CASCADE;
