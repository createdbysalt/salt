-- ============================================================================
-- CREATE: calendar_connections table for OAuth tokens (Google first)
-- ============================================================================
-- Stores encrypted OAuth tokens per-user/per-provider for calendar sync.
-- Phase 1: Google Calendar only.
-- ============================================================================

-- Create calendar_connections table
CREATE TABLE public.calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider info
  provider text NOT NULL, -- 'google' for Phase 1
  provider_account_email text, -- Email of connected calendar account
  
  -- Encrypted tokens (use server-side encryption/decryption)
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  
  -- Calendar settings
  calendar_id text, -- Specific calendar ID within the provider account
  scopes text[], -- OAuth scopes granted
  
  -- Status
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_provider CHECK (
    provider = ANY (ARRAY['google'::text, 'outlook'::text, 'ical'::text])
  ),
  -- One connection per user per provider
  UNIQUE(user_id, provider)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lookup by user
CREATE INDEX idx_calendar_connections_user 
  ON public.calendar_connections(user_id);

-- Lookup by studio (for admin auditing)
CREATE INDEX idx_calendar_connections_studio 
  ON public.calendar_connections(studio_id);

-- Active connections only
CREATE INDEX idx_calendar_connections_active 
  ON public.calendar_connections(user_id, provider) 
  WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own calendar connections
CREATE POLICY "Users can manage their own calendar connections"
  ON public.calendar_connections FOR ALL
  USING (user_id = auth.uid());

-- Optional: Studio admins can view connections for auditing (read-only)
CREATE POLICY "Studio admins can view team calendar connections"
  ON public.calendar_connections FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
        AND role = ANY (ARRAY['owner'::text, 'admin'::text])
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-set studio_id from studio_members on insert
CREATE OR REPLACE FUNCTION public.set_calendar_connection_studio_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get user's primary studio (or first studio they're a member of)
  SELECT studio_id INTO NEW.studio_id
  FROM public.studio_members
  WHERE user_id = NEW.user_id
  LIMIT 1;
  
  IF NEW.studio_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create calendar connection: user % is not a member of any studio', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_calendar_connection_studio_id
  BEFORE INSERT ON public.calendar_connections
  FOR EACH ROW
  WHEN (NEW.studio_id IS NULL)
  EXECUTE FUNCTION public.set_calendar_connection_studio_id();

-- Update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_calendar_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_connections_updated_at
  BEFORE UPDATE ON public.calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_calendar_connections_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.calendar_connections IS 'OAuth calendar connections per user (Google Calendar in Phase 1)';
COMMENT ON COLUMN public.calendar_connections.access_token_ciphertext IS 'Encrypted OAuth access token (AES-256-GCM, decrypted server-side only)';
COMMENT ON COLUMN public.calendar_connections.refresh_token_ciphertext IS 'Encrypted OAuth refresh token (AES-256-GCM, decrypted server-side only)';
COMMENT ON COLUMN public.calendar_connections.scopes IS 'OAuth scopes granted by the user (e.g., calendar.readonly, calendar.events)';
COMMENT ON COLUMN public.calendar_connections.is_active IS 'Whether this connection is currently active (false if revoked or expired)';
COMMENT ON COLUMN public.calendar_connections.last_synced_at IS 'Last successful sync timestamp for incremental sync strategies';

