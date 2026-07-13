-- Insert memory-records blueprint for FK constraint support
-- This blueprint represents the unified Memory Records playbook (v2 package)

INSERT INTO public.playbook_blueprints (
  slug,
  name,
  player_slug,
  description,
  kind,
  procedure_md,
  definition
)
VALUES (
  'memory-records',
  'Memory Records',
  'keeper',
  'Salt keeps your records complete and accurate by learning from your connected accounts.',
  'profile',
  'Unified Memory Records playbook - managed by v2 package system.',
  '{"version": 1}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
