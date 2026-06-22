-- ============================================================================
-- Playbook blueprints: global registry, evals, learning loop
-- Plan: System Playbooks Architecture (2026-06-20)
-- ============================================================================

-- Global blueprint registry (Salt-authored, versioned)
CREATE TABLE IF NOT EXISTS public.playbook_blueprints (
  slug text PRIMARY KEY,
  name text NOT NULL,
  player_slug text NOT NULL,
  description text,
  when_to_use text,
  trigger jsonb NOT NULL DEFAULT '{}'::jsonb,
  procedure_md text NOT NULL,
  definition jsonb NOT NULL,
  required_actions text[] NOT NULL DEFAULT '{}',
  value_model jsonb,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deprecated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.playbook_blueprints IS
  'Global Salt-authored playbook recipes. Workspaces adopt into play_templates.';

-- Immutable version history
CREATE TABLE IF NOT EXISTS public.playbook_blueprint_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_slug text NOT NULL REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE,
  version integer NOT NULL,
  procedure_md text NOT NULL,
  definition jsonb NOT NULL,
  required_actions text[] NOT NULL DEFAULT '{}',
  value_model jsonb,
  change_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blueprint_slug, version)
);

CREATE INDEX IF NOT EXISTS idx_playbook_blueprint_versions_slug
  ON public.playbook_blueprint_versions(blueprint_slug, version DESC);

-- Link adopted templates to source blueprint
ALTER TABLE public.play_templates
  ADD COLUMN IF NOT EXISTS blueprint_slug text
    REFERENCES public.playbook_blueprints(slug) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blueprint_version integer;

CREATE INDEX IF NOT EXISTS idx_play_templates_blueprint
  ON public.play_templates(studio_id, blueprint_slug)
  WHERE blueprint_slug IS NOT NULL;

-- Per-workspace learning signals
CREATE TABLE IF NOT EXISTS public.playbook_learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  blueprint_slug text REFERENCES public.playbook_blueprints(slug) ON DELETE SET NULL,
  template_id uuid REFERENCES public.play_templates(id) ON DELETE SET NULL,
  play_run_id uuid REFERENCES public.play_runs(id) ON DELETE SET NULL,
  signal_type text NOT NULL
    CHECK (signal_type IN ('edited', 'dismissed', 'failed', 'guard_skipped')),
  delta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_learning_signals_workspace
  ON public.playbook_learning_signals(workspace_id, blueprint_slug, created_at DESC);

ALTER TABLE public.playbook_learning_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_playbook_learning_signals"
  ON public.playbook_learning_signals FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_insert_playbook_learning_signals"
  ON public.playbook_learning_signals FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Human-approved improvement proposals
CREATE TABLE IF NOT EXISTS public.playbook_improvement_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_slug text NOT NULL REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE,
  from_version integer NOT NULL,
  proposed_procedure_md text NOT NULL,
  proposed_definition jsonb NOT NULL,
  proposed_required_actions text[] NOT NULL DEFAULT '{}',
  rationale text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  benchmark_delta jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_improvement_proposals_pending
  ON public.playbook_improvement_proposals(blueprint_slug, status)
  WHERE status = 'pending';

-- Eval suite (synced from repo evals.json; edge cases promoted at runtime)
CREATE TABLE IF NOT EXISTS public.playbook_evals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_slug text NOT NULL REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE,
  eval_key text NOT NULL,
  name text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  mocks jsonb NOT NULL DEFAULT '{}'::jsonb,
  assertions jsonb NOT NULL DEFAULT '[]'::jsonb,
  origin text NOT NULL DEFAULT 'authored'
    CHECK (origin IN ('authored', 'from_edge_case')),
  source_run_id uuid REFERENCES public.play_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blueprint_slug, eval_key)
);

-- Benchmark results per blueprint version
CREATE TABLE IF NOT EXISTS public.playbook_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_slug text NOT NULL REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE,
  version integer NOT NULL,
  eval_id uuid NOT NULL REFERENCES public.playbook_evals(id) ON DELETE CASCADE,
  passed boolean NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  scored_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_eval_runs_version
  ON public.playbook_eval_runs(blueprint_slug, version, scored_at DESC);
