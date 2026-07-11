-- ============================================================================
-- Playbook required_toolkits: connector dependencies for playbooks
-- Plan: Playbook Authoring v2 (Phase 2.5)
-- ============================================================================

-- Add required_toolkits to blueprints
ALTER TABLE public.playbook_blueprints
  ADD COLUMN IF NOT EXISTS required_toolkits text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.playbook_blueprints.required_toolkits IS
  'Composio toolkit slugs required by this playbook (e.g. gmail, stripe). Derived from required_actions if not explicit.';

-- Add required_toolkits to version history
ALTER TABLE public.playbook_blueprint_versions
  ADD COLUMN IF NOT EXISTS required_toolkits text[] NOT NULL DEFAULT '{}';

-- Add required_toolkits to improvement proposals
ALTER TABLE public.playbook_improvement_proposals
  ADD COLUMN IF NOT EXISTS proposed_required_toolkits text[] NOT NULL DEFAULT '{}';

-- Add required_toolkits to play_templates (adopted playbooks)
ALTER TABLE public.play_templates
  ADD COLUMN IF NOT EXISTS required_toolkits text[] NOT NULL DEFAULT '{}';
