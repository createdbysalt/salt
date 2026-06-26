-- ============================================================================
-- Profile playbooks: kind + fill_rules, provenance, workspace settings, Keeper
-- Plan: Profile Playbooks (2026-06-20)
-- ============================================================================

ALTER TABLE public.playbook_blueprints
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'acting'
    CHECK (kind IN ('acting', 'profile')),
  ADD COLUMN IF NOT EXISTS fill_rules jsonb;

ALTER TABLE public.playbook_blueprint_versions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'acting'
    CHECK (kind IN ('acting', 'profile')),
  ADD COLUMN IF NOT EXISTS fill_rules jsonb;

COMMENT ON COLUMN public.playbook_blueprints.kind IS
  'acting = fetch/guard/llm/act play runs; profile = Memory fill rules per entity';

-- Provenance: why Salt filled a profile field
CREATE TABLE IF NOT EXISTS public.profile_field_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('person', 'organization', 'work')),
  entity_id uuid NOT NULL,
  field text NOT NULL,
  value jsonb NOT NULL,
  source text NOT NULL CHECK (source IN ('rule', 'ai_fallback', 'manual')),
  rule_id text,
  confidence integer,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  blueprint_slug text REFERENCES public.playbook_blueprints(slug) ON DELETE SET NULL,
  blueprint_version integer,
  status text NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'pending')),
  set_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_field_provenance_entity
  ON public.profile_field_provenance(workspace_id, entity_type, entity_id, field, set_at DESC);

ALTER TABLE public.profile_field_provenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_profile_field_provenance"
  ON public.profile_field_provenance FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_insert_profile_field_provenance"
  ON public.profile_field_provenance FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_update_profile_field_provenance"
  ON public.profile_field_provenance FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace override layer for profile playbooks
CREATE TABLE IF NOT EXISTS public.profile_playbook_settings (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  blueprint_slug text NOT NULL REFERENCES public.playbook_blueprints(slug) ON DELETE CASCADE,
  fill_rules_override jsonb,
  auto_apply_threshold integer NOT NULL DEFAULT 85
    CHECK (auto_apply_threshold >= 0 AND auto_apply_threshold <= 100),
  ai_fallback_enabled boolean NOT NULL DEFAULT true,
  context_facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  active_sections text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, blueprint_slug)
);

ALTER TABLE public.profile_playbook_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_manage_profile_playbook_settings"
  ON public.profile_playbook_settings FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Backfill Keeper player for existing workspaces
INSERT INTO public.players (studio_id, slug, name, role_label, tone, department, is_active)
SELECT w.id, 'keeper', 'Keeper', 'Record upkeep', 'ink', 'knowledge', true
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.players p
  WHERE p.studio_id = w.id AND p.slug = 'keeper'
);
