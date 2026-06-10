-- ============================================================================
-- Migration: Plays + opportunity gaps (Milestone B lite)
-- Wave 1 uses studio_id FK; rename to workspace_id in post-Wave-1 tenant rename.
-- ============================================================================

-- Players (functional roles per studio)
CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  role_label text,
  description text,
  tone text DEFAULT 'muted',
  department text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (studio_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_players_studio ON public.players(studio_id);

-- Play templates (reusable recipes)
CREATE TABLE IF NOT EXISTS public.play_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  default_channel text DEFAULT 'Gmail',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (studio_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_play_templates_studio ON public.play_templates(studio_id);

-- Play runs (queue items)
CREATE TABLE IF NOT EXISTS public.play_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.play_templates(id) ON DELETE SET NULL,
  opportunity_gap_id uuid,
  state text NOT NULL DEFAULT 'queued'
    CHECK (state IN ('draft', 'queued', 'approved', 'scheduled', 'ran', 'dismissed')),
  title text NOT NULL,
  preview text,
  recipient_label text,
  channel text DEFAULT 'Gmail',
  channels text[] DEFAULT '{}',
  draft_body text,
  confidence smallint CHECK (confidence >= 0 AND confidence <= 100),
  eta_label text,
  scheduled_for timestamptz,
  approved_at timestamptz,
  ran_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_play_runs_studio_state ON public.play_runs(studio_id, state);
CREATE INDEX IF NOT EXISTS idx_play_runs_studio_created ON public.play_runs(studio_id, created_at DESC);

-- Opportunity gaps (LEARN surface)
CREATE TABLE IF NOT EXISTS public.opportunity_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  claim text NOT NULL,
  summary text,
  amount_min numeric(12,2),
  amount_max numeric(12,2),
  currency text DEFAULT 'USD',
  confidence smallint CHECK (confidence >= 0 AND confidence <= 100),
  category text,
  is_primary boolean DEFAULT false,
  sources jsonb DEFAULT '[]'::jsonb,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunity_gaps_studio ON public.opportunity_gaps(studio_id, created_at DESC);

ALTER TABLE public.play_runs
  ADD CONSTRAINT play_runs_opportunity_gap_id_fkey
  FOREIGN KEY (opportunity_gap_id) REFERENCES public.opportunity_gaps(id) ON DELETE SET NULL;

-- Play run sources (trust trail)
CREATE TABLE IF NOT EXISTS public.play_run_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  play_run_id uuid NOT NULL REFERENCES public.play_runs(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  label text,
  excerpt text,
  external_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_play_run_sources_run ON public.play_run_sources(play_run_id);

-- Activity entries (approve/dismiss/edit log)
CREATE TABLE IF NOT EXISTS public.activity_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  play_run_id uuid REFERENCES public.play_runs(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL
    CHECK (action IN ('created', 'approved', 'dismissed', 'scheduled', 'edited', 'ran', 'logged')),
  title text NOT NULL,
  detail text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_entries_studio ON public.activity_entries(studio_id, created_at DESC);

-- RLS helper pattern: studio_members
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_run_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_members_view_players" ON public.players;
DROP POLICY IF EXISTS "studio_members_manage_players" ON public.players;
CREATE POLICY "studio_members_view_players" ON public.players
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_players" ON public.players
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "studio_members_view_play_templates" ON public.play_templates;
DROP POLICY IF EXISTS "studio_members_manage_play_templates" ON public.play_templates;
CREATE POLICY "studio_members_view_play_templates" ON public.play_templates
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_play_templates" ON public.play_templates
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "studio_members_view_play_runs" ON public.play_runs;
DROP POLICY IF EXISTS "studio_members_manage_play_runs" ON public.play_runs;
CREATE POLICY "studio_members_view_play_runs" ON public.play_runs
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_play_runs" ON public.play_runs
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "studio_members_view_opportunity_gaps" ON public.opportunity_gaps;
DROP POLICY IF EXISTS "studio_members_manage_opportunity_gaps" ON public.opportunity_gaps;
CREATE POLICY "studio_members_view_opportunity_gaps" ON public.opportunity_gaps
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_opportunity_gaps" ON public.opportunity_gaps
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "studio_members_view_play_run_sources" ON public.play_run_sources;
DROP POLICY IF EXISTS "studio_members_manage_play_run_sources" ON public.play_run_sources;
CREATE POLICY "studio_members_view_play_run_sources" ON public.play_run_sources
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_play_run_sources" ON public.play_run_sources
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "studio_members_view_activity_entries" ON public.activity_entries;
DROP POLICY IF EXISTS "studio_members_manage_activity_entries" ON public.activity_entries;
CREATE POLICY "studio_members_view_activity_entries" ON public.activity_entries
FOR SELECT USING (
  studio_id IN (SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid())
);
CREATE POLICY "studio_members_manage_activity_entries" ON public.activity_entries
FOR ALL USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  )
);

COMMENT ON TABLE public.play_runs IS 'Queued and historical plays; state: draft→queued→approved→scheduled→ran→dismissed';
COMMENT ON TABLE public.opportunity_gaps IS 'Quantified LEARN opportunities with range + confidence';
COMMENT ON COLUMN public.play_runs.studio_id IS 'Rename to workspace_id in tenant-rename wave';
