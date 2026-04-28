-- ============================================================================
-- CREATE: studio_calendar_connections table
-- ============================================================================
-- Stores OAuth connections to Google Calendar / Microsoft Outlook for
-- Recall.ai Calendar integration. Enables auto-recording of client meetings
-- for users who don't use Cal.com.
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLE
-- ============================================================================

CREATE TABLE public.studio_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Recall Calendar API
  recall_calendar_id text NOT NULL UNIQUE,

  -- OAuth connection info (matches Recall API: google_calendar, microsoft_outlook)
  provider text NOT NULL CHECK (provider IN ('google', 'microsoft', 'google_calendar', 'microsoft_outlook')),
  email text NOT NULL,

  -- Status
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_error text,
  disconnected_at timestamptz,

  -- Settings
  auto_record_client_meetings boolean DEFAULT true,
  bot_name_override text, -- Custom bot name, falls back to studio name

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- One connection per provider per user per studio
  UNIQUE(studio_id, user_id, provider)
);

-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX studio_calendar_connections_studio_id_idx
  ON public.studio_calendar_connections(studio_id);

CREATE INDEX studio_calendar_connections_user_id_idx
  ON public.studio_calendar_connections(user_id);

CREATE INDEX studio_calendar_connections_recall_calendar_id_idx
  ON public.studio_calendar_connections(recall_calendar_id);

CREATE INDEX studio_calendar_connections_active_idx
  ON public.studio_calendar_connections(studio_id, is_active)
  WHERE is_active = true;

-- ============================================================================
-- STEP 3: ENABLE RLS
-- ============================================================================

ALTER TABLE public.studio_calendar_connections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================================

-- Users can view their own calendar connections
CREATE POLICY "users_view_own_calendar_connections"
  ON public.studio_calendar_connections
  FOR SELECT USING (user_id = auth.uid());

-- Users can manage their own calendar connections
CREATE POLICY "users_manage_own_calendar_connections"
  ON public.studio_calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- Studio admins can view all studio calendar connections
CREATE POLICY "studio_admins_view_calendar_connections"
  ON public.studio_calendar_connections
  FOR SELECT USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- STEP 5: CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_studio_calendar_connections_updated_at
  BEFORE UPDATE ON public.studio_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 6: ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE public.studio_calendar_connections IS
  'OAuth connections to Google/Outlook calendars for Recall.ai auto-recording';

COMMENT ON COLUMN public.studio_calendar_connections.recall_calendar_id IS
  'Recall.ai Calendar API calendar ID';

COMMENT ON COLUMN public.studio_calendar_connections.provider IS
  'OAuth provider: google or microsoft';

COMMENT ON COLUMN public.studio_calendar_connections.auto_record_client_meetings IS
  'Automatically record meetings where attendee matches a client email';

COMMENT ON COLUMN public.studio_calendar_connections.bot_name_override IS
  'Custom name for the Recall bot, falls back to "[Studio Name] Notetaker"';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
