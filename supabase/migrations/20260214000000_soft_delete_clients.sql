-- ============================================================================
-- Soft Delete & Archive for Clients
-- ============================================================================
-- Adds soft delete (30-day retention) and archive functionality to clients.
-- - archived_at: Client is hidden from active list but fully accessible
-- - deleted_at: Client is in "trash" for 30 days, then permanently deleted
-- - deleted_by: Who deleted the client (for audit trail)
-- ============================================================================

-- Add columns for soft delete and archive
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- Add comments for documentation
COMMENT ON COLUMN public.clients.archived_at IS 'When client was archived. Archived clients are hidden from active list but fully accessible.';
COMMENT ON COLUMN public.clients.deleted_at IS 'When client was soft deleted. Client will be permanently deleted 30 days after this timestamp.';
COMMENT ON COLUMN public.clients.deleted_by IS 'User who deleted the client (for audit trail).';

-- Index for efficient filtering of archived clients
CREATE INDEX IF NOT EXISTS clients_archived_at_idx
  ON public.clients(studio_id, archived_at)
  WHERE archived_at IS NOT NULL;

-- Index for efficient filtering of deleted clients
CREATE INDEX IF NOT EXISTS clients_deleted_at_idx
  ON public.clients(studio_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Index for querying clients due for permanent deletion
CREATE INDEX IF NOT EXISTS clients_deleted_at_purge_idx
  ON public.clients(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- Note on 30-day auto-deletion
-- ============================================================================
-- pg_cron is required for automatic cleanup but may not be available.
-- Options for production:
-- 1. Enable pg_cron via Supabase Dashboard > Database > Extensions (Pro plan)
-- 2. Use a Supabase Edge Function with a cron trigger
-- 3. Use an external cron service to call a cleanup endpoint
--
-- Manual cleanup query (run periodically if pg_cron not available):
-- DELETE FROM public.clients WHERE deleted_at < now() - interval '30 days';

-- Helper function to get days remaining before permanent deletion
CREATE OR REPLACE FUNCTION public.get_deletion_days_remaining(deleted_at_timestamp timestamptz)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(0, 30 - EXTRACT(DAY FROM (now() - deleted_at_timestamp))::integer);
$$;

COMMENT ON FUNCTION public.get_deletion_days_remaining IS 'Returns the number of days remaining before a soft-deleted record is permanently deleted (30-day retention).';
