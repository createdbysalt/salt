-- ============================================================================
-- ME: Operator memory layer
-- ============================================================================
-- Turns /me into Salt's operator memory layer. Three new user-scoped tables
-- (facts, voice profile, goals) plus identity columns on profiles. All tables
-- are workspace-scoped for tenancy AND user-scoped for privacy: a fact belongs
-- to the operator who owns it, not the whole workspace.
-- ============================================================================

-- ─── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.operator_fact_category AS ENUM (
    'identity', 'business', 'preference', 'goal', 'voice', 'relationship'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.operator_fact_kind AS ENUM ('fact', 'preference', 'procedure');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.operator_fact_scope AS ENUM ('global', 'person', 'org', 'topic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.operator_fact_status AS ENUM ('proposed', 'confirmed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.operator_fact_source AS ENUM ('manual', 'ai_capture', 'ask_salt', 'draft_edit');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.operator_goal_horizon AS ENUM ('week', 'quarter', 'year');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.operator_goal_status AS ENUM ('active', 'paused', 'done', 'dropped');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── operator_memory_facts ──────────────────────────────────────────────────
-- Declarative statements Salt knows about the operator. `proposed` facts never
-- enter AI context; promote on explicit confirm OR vote_count >= 3.
CREATE TABLE IF NOT EXISTS public.operator_memory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  category public.operator_fact_category NOT NULL DEFAULT 'preference',
  kind public.operator_fact_kind NOT NULL DEFAULT 'fact',
  scope_type public.operator_fact_scope NOT NULL DEFAULT 'global',
  scope_value TEXT,

  label TEXT,
  value TEXT NOT NULL,

  status public.operator_fact_status NOT NULL DEFAULT 'proposed',
  source public.operator_fact_source NOT NULL DEFAULT 'manual',
  confidence INTEGER CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
  vote_count INTEGER NOT NULL DEFAULT 1,

  source_capture_id UUID REFERENCES public.capture_events(id) ON DELETE SET NULL,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_operator_facts_workspace_user
  ON public.operator_memory_facts(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_operator_facts_user_status
  ON public.operator_memory_facts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_operator_facts_capture
  ON public.operator_memory_facts(source_capture_id)
  WHERE source_capture_id IS NOT NULL;

CREATE TRIGGER operator_memory_facts_updated_at
  BEFORE UPDATE ON public.operator_memory_facts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.operator_memory_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operator_views_own_facts"
  ON public.operator_memory_facts FOR SELECT
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "operator_creates_own_facts"
  ON public.operator_memory_facts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "operator_updates_own_facts"
  ON public.operator_memory_facts FOR UPDATE
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "operator_deletes_own_facts"
  ON public.operator_memory_facts FOR DELETE
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "service_role_manage_operator_facts"
  ON public.operator_memory_facts FOR ALL
  TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_memory_facts TO authenticated;
GRANT ALL ON public.operator_memory_facts TO service_role;

COMMENT ON TABLE public.operator_memory_facts IS 'Declarative facts Salt knows about the operator; proposed facts require confirm/promotion before entering AI context';

-- ─── operator_voice_profile ─────────────────────────────────────────────────
-- Personal voice, layered over workspace_brand_config. One row per user/workspace.
CREATE TABLE IF NOT EXISTS public.operator_voice_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  voice_tone TEXT[] NOT NULL DEFAULT '{}',
  voice_spectrums JSONB,
  voice_archetype TEXT,
  voice_style_guide TEXT,
  learned_style TEXT,
  voice_terminology JSONB NOT NULL DEFAULT '{"preferred":[],"avoid":[]}'::jsonb,
  inherits_workspace BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT operator_voice_profile_user_unique UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_operator_voice_workspace_user
  ON public.operator_voice_profile(workspace_id, user_id);

CREATE TRIGGER operator_voice_profile_updated_at
  BEFORE UPDATE ON public.operator_voice_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.operator_voice_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operator_views_own_voice"
  ON public.operator_voice_profile FOR SELECT
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "operator_creates_own_voice"
  ON public.operator_voice_profile FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "operator_updates_own_voice"
  ON public.operator_voice_profile FOR UPDATE
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "operator_deletes_own_voice"
  ON public.operator_voice_profile FOR DELETE
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "service_role_manage_operator_voice"
  ON public.operator_voice_profile FOR ALL
  TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_voice_profile TO authenticated;
GRANT ALL ON public.operator_voice_profile TO service_role;

COMMENT ON TABLE public.operator_voice_profile IS 'Personal voice profile layered over workspace_brand_config; precedence: explicit style > learned style > workspace voice > humanized default';

-- ─── operator_goals ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operator_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  detail TEXT,
  horizon public.operator_goal_horizon NOT NULL DEFAULT 'quarter',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status public.operator_goal_status NOT NULL DEFAULT 'active',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_goals_workspace_user
  ON public.operator_goals(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_operator_goals_user_status
  ON public.operator_goals(user_id, status);

CREATE TRIGGER operator_goals_updated_at
  BEFORE UPDATE ON public.operator_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.operator_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operator_views_own_goals"
  ON public.operator_goals FOR SELECT
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "operator_creates_own_goals"
  ON public.operator_goals FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "operator_updates_own_goals"
  ON public.operator_goals FOR UPDATE
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "operator_deletes_own_goals"
  ON public.operator_goals FOR DELETE
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "service_role_manage_operator_goals"
  ON public.operator_goals FOR ALL
  TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_goals TO authenticated;
GRANT ALL ON public.operator_goals TO service_role;

COMMENT ON TABLE public.operator_goals IS 'Operator personal/business goals surfaced and prioritized by Salt';

-- ─── profiles identity columns ──────────────────────────────────────────────
-- timezone, company_name, job_title already exist (see 20260313 migration).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS working_hours TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS email_signature TEXT,
  ADD COLUMN IF NOT EXISTS current_focus TEXT,
  ADD COLUMN IF NOT EXISTS role_title TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT;

COMMENT ON COLUMN public.profiles.working_hours IS 'Operator working hours, used by Salt for scheduling and tone';
COMMENT ON COLUMN public.profiles.email_signature IS 'Operator email signature Salt appends when drafting as the user';
COMMENT ON COLUMN public.profiles.current_focus IS 'What the operator is currently focused on; steers prioritization';
COMMENT ON COLUMN public.profiles.role_title IS 'Operator role/title shown on /me and used in drafting';
