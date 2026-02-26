-- Gmail OAuth connections for studio users
-- Allows sending messages via user's Gmail and receiving replies

-- Store Gmail OAuth tokens (encrypted)
CREATE TABLE public.gmail_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  email text NOT NULL,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  history_id text, -- Gmail history ID for incremental sync
  watch_expiration timestamptz, -- When Gmail push subscription expires
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, studio_id)
);

-- Index for lookups
CREATE INDEX idx_gmail_connections_user_id ON public.gmail_connections(user_id);
CREATE INDEX idx_gmail_connections_studio_id ON public.gmail_connections(studio_id);
CREATE INDEX idx_gmail_connections_email ON public.gmail_connections(email);

-- Enable RLS
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own Gmail connections
CREATE POLICY "Users can view their own Gmail connections"
  ON public.gmail_connections FOR SELECT
  USING (user_id = auth.uid());

-- Users can manage their own Gmail connections
CREATE POLICY "Users can manage their own Gmail connections"
  ON public.gmail_connections FOR ALL
  USING (user_id = auth.uid());

-- Add Gmail tracking columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS gmail_thread_id text,
  ADD COLUMN IF NOT EXISTS gmail_message_id text,
  ADD COLUMN IF NOT EXISTS sent_via text DEFAULT 'bridge'
    CHECK (sent_via IN ('bridge', 'gmail', 'resend', 'email_reply'));

-- Index for thread matching
CREATE INDEX IF NOT EXISTS idx_messages_gmail_thread_id ON public.messages(gmail_thread_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_gmail_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gmail_connections_updated_at
  BEFORE UPDATE ON public.gmail_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_connections_updated_at();

-- Comments
COMMENT ON TABLE public.gmail_connections IS 'Stores Gmail OAuth tokens for studio users to send/receive messages via their Gmail';
COMMENT ON COLUMN public.gmail_connections.access_token_encrypted IS 'Encrypted OAuth access token';
COMMENT ON COLUMN public.gmail_connections.refresh_token_encrypted IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN public.gmail_connections.history_id IS 'Gmail history ID for incremental sync of new messages';
COMMENT ON COLUMN public.gmail_connections.watch_expiration IS 'When the Gmail push notification watch expires (needs renewal)';
