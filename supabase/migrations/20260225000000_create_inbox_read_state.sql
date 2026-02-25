-- ============================================================================
-- CREATE: inbox_read_states table
-- ============================================================================
-- Tracks read/unread state for unified inbox items across all sources.
-- Uses composite key of source_table + source_id to reference any inbox item.
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE INBOX_READ_STATES TABLE
-- ============================================================================

CREATE TABLE public.inbox_read_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who read the item
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- What was read (polymorphic reference to any source table)
  source_table text NOT NULL,
  source_id uuid NOT NULL,

  -- Read state
  read_at timestamptz NOT NULL DEFAULT now(),

  -- Additional states (for future use)
  archived_at timestamptz,
  snoozed_until timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Unique constraint: one read state per user per item
  UNIQUE(user_id, source_table, source_id)
);

-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

-- Fast lookup by user
CREATE INDEX idx_inbox_read_states_user ON public.inbox_read_states(user_id);

-- Fast lookup by studio
CREATE INDEX idx_inbox_read_states_studio ON public.inbox_read_states(studio_id);

-- Fast lookup by source (for joining in queries)
CREATE INDEX idx_inbox_read_states_source ON public.inbox_read_states(source_table, source_id);

-- Fast lookup for unread items (where read_at is null would be unread, but we insert on read)
CREATE INDEX idx_inbox_read_states_user_source ON public.inbox_read_states(user_id, source_table, source_id);

-- ============================================================================
-- STEP 3: ENABLE RLS
-- ============================================================================

ALTER TABLE public.inbox_read_states ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================================

-- Users can only see their own read states
CREATE POLICY "users_view_own_read_states" ON public.inbox_read_states
FOR SELECT USING (user_id = auth.uid());

-- Users can only insert their own read states
CREATE POLICY "users_insert_own_read_states" ON public.inbox_read_states
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own read states
CREATE POLICY "users_update_own_read_states" ON public.inbox_read_states
FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own read states
CREATE POLICY "users_delete_own_read_states" ON public.inbox_read_states
FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- STEP 5: CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_inbox_read_states_updated_at
  BEFORE UPDATE ON public.inbox_read_states
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 6: ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE public.inbox_read_states IS 'Tracks read state for unified inbox items (messages, proposals, meetings, etc.)';
COMMENT ON COLUMN public.inbox_read_states.source_table IS 'The source table name (conversations, proposals, client_meetings, etc.)';
COMMENT ON COLUMN public.inbox_read_states.source_id IS 'The UUID of the record in the source table';
COMMENT ON COLUMN public.inbox_read_states.read_at IS 'When the user first read/viewed this item';
COMMENT ON COLUMN public.inbox_read_states.archived_at IS 'When the user archived this item (null if not archived)';
COMMENT ON COLUMN public.inbox_read_states.snoozed_until IS 'When to resurface this item (null if not snoozed)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
