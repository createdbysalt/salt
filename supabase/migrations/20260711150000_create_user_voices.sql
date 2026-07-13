-- Migration: Create user_voices table for Playbook v2 Voice Profiles
-- Replaces players-as-voice-profiles with dedicated voice system
-- Players table retained for backwards compatibility but deprecated

-- =============================================================================
-- 1. Create user_voices table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_voices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Voice identity
  slug text NOT NULL,
  name text NOT NULL,

  -- Voice characteristics
  tone text NOT NULL,
  instructions text NOT NULL,
  sign_off text,

  -- Ownership
  type text NOT NULL CHECK (type IN ('salt', 'custom')),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Constraints
  -- Salt voices: slug unique globally (workspace_id is NULL)
  -- Custom voices: slug unique per workspace
  CONSTRAINT unique_salt_voice UNIQUE NULLS NOT DISTINCT (slug, workspace_id)
);

-- Index for efficient workspace lookups
CREATE INDEX IF NOT EXISTS idx_user_voices_workspace ON public.user_voices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_voices_slug ON public.user_voices(slug);

-- =============================================================================
-- 2. Seed Salt-provided voices
-- =============================================================================

INSERT INTO public.user_voices (slug, name, tone, instructions, sign_off, type, workspace_id)
VALUES
  (
    'billing',
    'Billing',
    'professional, clear, firm',
    E'Be direct about amounts and dates.\nUse polite but firm language.\nKeep messages under 150 words.',
    'Best regards',
    'salt',
    NULL
  ),
  (
    'follow-up',
    'Follow-up',
    'warm, casual, non-pushy',
    E'Use contractions.\nReference something specific from last contact.\nKeep it brief, no pressure.',
    'Cheers',
    'salt',
    NULL
  ),
  (
    'brief',
    'Brief',
    'concise, factual, scannable',
    E'Use bullet points.\nLead with the most important info.\nNo pleasantries or filler.',
    NULL,
    'salt',
    NULL
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. RLS Policies
-- =============================================================================

ALTER TABLE public.user_voices ENABLE ROW LEVEL SECURITY;

-- Anyone can read Salt-provided voices
CREATE POLICY "Anyone can read Salt voices"
  ON public.user_voices
  FOR SELECT
  USING (type = 'salt');

-- Workspace members can read their custom voices
CREATE POLICY "Workspace members can read custom voices"
  ON public.user_voices
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

-- Workspace owners can create custom voices
CREATE POLICY "Workspace owners can create voices"
  ON public.user_voices
  FOR INSERT
  WITH CHECK (
    type = 'custom' AND
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

-- Workspace owners can update their custom voices
CREATE POLICY "Workspace owners can update custom voices"
  ON public.user_voices
  FOR UPDATE
  USING (
    type = 'custom' AND
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

-- Workspace owners can delete their custom voices
CREATE POLICY "Workspace owners can delete custom voices"
  ON public.user_voices
  FOR DELETE
  USING (
    type = 'custom' AND
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 4. Updated_at trigger
-- =============================================================================

CREATE TRIGGER set_user_voices_updated_at
  BEFORE UPDATE ON public.user_voices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 5. Add deprecation comment to players table
-- =============================================================================

COMMENT ON TABLE public.players IS
  'DEPRECATED: Use user_voices for voice profiles in Playbook v2. Players retained for backwards compatibility.';
