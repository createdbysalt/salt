-- ============================================================================
-- Migration: Grant table permissions on client_meetings
-- ============================================================================
--
-- The RLS policies are in place but the base table permissions were missing.
-- This grants the authenticated role access to the table (RLS still enforces
-- row-level access control).
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_meetings TO authenticated;
