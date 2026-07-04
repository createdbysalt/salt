-- ============================================================================
-- DROP ORPHANED auth.users TRIGGER (missed dependency of drop_bridge_tables)
-- ============================================================================
--
-- 20260702170000_drop_bridge_tables dropped public.client_users, but the
-- Bridge-era trigger auto_activate_client_user_trigger (20251230000000) on
-- auth.users still UPDATEs that table on every sign-in. DROP TABLE CASCADE
-- does not drop functions/triggers that merely reference a table in their
-- body, so since the drop EVERY login fails with
-- "Database error granting user".
--
-- Lesson recorded: before dropping a table, sweep pg_proc/pg_trigger bodies
-- for references, not just app-code imports.
-- ============================================================================

DROP TRIGGER IF EXISTS auto_activate_client_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_activate_client_user();
