-- ============================================================================
-- ALTER: Make read_at nullable in inbox_read_states
-- ============================================================================
-- The original design assumed rows are only inserted when items are read.
-- However, we now need to track archived/snoozed items that may not be read,
-- and support marking items as unread (read_at = NULL).
-- ============================================================================

-- Allow read_at to be NULL (for unread items)
ALTER TABLE public.inbox_read_states
  ALTER COLUMN read_at DROP NOT NULL;

-- Update the default to NULL (items start unread)
ALTER TABLE public.inbox_read_states
  ALTER COLUMN read_at DROP DEFAULT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
