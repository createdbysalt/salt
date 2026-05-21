-- Gmail Reply Tracking Schema
-- Enables capturing inbound emails (client replies) and matching them to conversations

-- ============================================================================
-- 1. Add direction and Gmail IDs to client_emails
-- ============================================================================

-- Direction: outbound (we sent) or inbound (client replied)
ALTER TABLE public.client_emails
ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound'
CHECK (direction IN ('outbound', 'inbound'));

-- Gmail Thread ID - groups related emails together (replies share same thread)
ALTER TABLE public.client_emails
ADD COLUMN IF NOT EXISTS gmail_thread_id text;

-- Gmail Message ID - unique identifier for deduplication
ALTER TABLE public.client_emails
ADD COLUMN IF NOT EXISTS gmail_message_id text;

-- Index for thread matching (find all emails in a thread)
CREATE INDEX IF NOT EXISTS idx_client_emails_gmail_thread_id
ON public.client_emails(gmail_thread_id)
WHERE gmail_thread_id IS NOT NULL;

-- Unique constraint to prevent duplicate message imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_emails_gmail_message_id_unique
ON public.client_emails(gmail_message_id)
WHERE gmail_message_id IS NOT NULL;

-- Index for finding inbound emails by recipient (the client who replied)
CREATE INDEX IF NOT EXISTS idx_client_emails_direction_sender
ON public.client_emails(direction, sender_email)
WHERE direction = 'inbound';

COMMENT ON COLUMN public.client_emails.direction IS 'outbound = sent by studio, inbound = received from client';
COMMENT ON COLUMN public.client_emails.gmail_thread_id IS 'Gmail thread ID for grouping related emails';
COMMENT ON COLUMN public.client_emails.gmail_message_id IS 'Gmail message ID for deduplication';

-- ============================================================================
-- 2. Add history ID to gmail_connections for incremental sync
-- ============================================================================

ALTER TABLE public.gmail_connections
ADD COLUMN IF NOT EXISTS history_id text;

COMMENT ON COLUMN public.gmail_connections.history_id IS 'Gmail history ID for incremental sync - tracks last synced state';

-- ============================================================================
-- 3. Create gmail_watches table to track active inbox watches
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

-- Users can view watches for their studio
DROP POLICY IF EXISTS "Studio members can view gmail watches" ON public.gmail_watches;
CREATE POLICY "Studio members can view gmail watches"
  ON public.gmail_watches FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own watches
DROP POLICY IF EXISTS "Users can manage their own gmail watches" ON public.gmail_watches;
CREATE POLICY "Users can manage their own gmail watches"
  ON public.gmail_watches FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.gmail_watches IS 'Tracks active Gmail inbox watches for push notifications';

-- ============================================================================
-- 4. Create gmail_sync_logs table for debugging/monitoring
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

-- Studio members can view their sync logs
DROP POLICY IF EXISTS "Studio members can view sync logs" ON public.gmail_sync_logs;
CREATE POLICY "Studio members can view sync logs"
  ON public.gmail_sync_logs FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
  );

-- System can insert logs (via service role)
DROP POLICY IF EXISTS "Service role can insert sync logs" ON public.gmail_sync_logs;
CREATE POLICY "Service role can insert sync logs"
  ON public.gmail_sync_logs FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.gmail_sync_logs IS 'Audit log for Gmail sync operations - useful for debugging';

-- ============================================================================
-- 5. Update trigger for gmail_watches.updated_at
-- ============================================================================

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
