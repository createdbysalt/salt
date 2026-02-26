-- Gmail Watches and Sync Logs Tables
-- Separated from original migration to handle partial application

-- ============================================================================
-- 1. Create gmail_watches table to track active inbox watches
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gmail_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who owns this watch
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  gmail_connection_id uuid NOT NULL REFERENCES public.gmail_connections(id) ON DELETE CASCADE,

  -- Watch state
  gmail_email text NOT NULL,
  resource_id text, -- Gmail's resource ID for the watch
  expiration_at timestamptz NOT NULL, -- Watches expire after 7 days

  -- Sync tracking
  last_history_id text, -- Last processed history ID
  last_sync_at timestamptz, -- When we last synced

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'stopped', 'error')),
  error_message text,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- One watch per Gmail account per studio
  CONSTRAINT gmail_watches_unique UNIQUE (gmail_connection_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gmail_watches_user_id ON public.gmail_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_watches_studio_id ON public.gmail_watches(studio_id);
CREATE INDEX IF NOT EXISTS idx_gmail_watches_status ON public.gmail_watches(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_gmail_watches_expiration ON public.gmail_watches(expiration_at) WHERE status = 'active';

-- RLS
ALTER TABLE public.gmail_watches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Studio members can view gmail watches" ON public.gmail_watches;
DROP POLICY IF EXISTS "Users can manage their own gmail watches" ON public.gmail_watches;

-- Users can view watches for their studio
CREATE POLICY "Studio members can view gmail watches"
  ON public.gmail_watches FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own watches
CREATE POLICY "Users can manage their own gmail watches"
  ON public.gmail_watches FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.gmail_watches IS 'Tracks active Gmail inbox watches for push notifications';

-- ============================================================================
-- 2. Create gmail_sync_logs table for debugging/monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gmail_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  gmail_watch_id uuid REFERENCES public.gmail_watches(id) ON DELETE SET NULL,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

  -- What happened
  event_type text NOT NULL CHECK (event_type IN (
    'watch_started', 'watch_renewed', 'watch_stopped', 'watch_expired',
    'notification_received', 'sync_started', 'sync_completed', 'sync_failed',
    'email_imported', 'email_skipped', 'email_duplicate'
  )),

  -- Details
  history_id text,
  emails_processed int DEFAULT 0,
  emails_imported int DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for querying logs
CREATE INDEX IF NOT EXISTS idx_gmail_sync_logs_watch_id ON public.gmail_sync_logs(gmail_watch_id);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_logs_studio_id ON public.gmail_sync_logs(studio_id);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_logs_created_at ON public.gmail_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_logs_event_type ON public.gmail_sync_logs(event_type);

-- RLS
ALTER TABLE public.gmail_sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Studio members can view sync logs" ON public.gmail_sync_logs;
DROP POLICY IF EXISTS "Service role can insert sync logs" ON public.gmail_sync_logs;

-- Studio members can view their sync logs
CREATE POLICY "Studio members can view sync logs"
  ON public.gmail_sync_logs FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
  );

-- System can insert logs (via service role)
CREATE POLICY "Service role can insert sync logs"
  ON public.gmail_sync_logs FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.gmail_sync_logs IS 'Audit log for Gmail sync operations - useful for debugging';

-- ============================================================================
-- 3. Update trigger for gmail_watches.updated_at
-- ============================================================================

-- Create the set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_gmail_watches_updated_at ON public.gmail_watches;
CREATE TRIGGER set_gmail_watches_updated_at
  BEFORE UPDATE ON public.gmail_watches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
