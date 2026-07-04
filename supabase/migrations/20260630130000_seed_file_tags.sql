-- ============================================================================
-- SEED DEFAULT FILE TAGS
-- ============================================================================
-- Creates default tags scoped to files for all existing workspaces.
-- These are starting points - users can create more as needed.
-- ============================================================================

-- First, update the scope check constraint to include 'file'
ALTER TABLE public.workspace_tags
  DROP CONSTRAINT IF EXISTS workspace_tags_scope_check;

ALTER TABLE public.workspace_tags
  ADD CONSTRAINT workspace_tags_scope_check
  CHECK (scope IN ('person', 'org', 'work', 'billing', 'file', 'all'));

-- Insert default file tags for each workspace
INSERT INTO public.workspace_tags (
  workspace_id,
  slug,
  label,
  scope,
  category,
  color,
  is_system,
  sort_order
)
SELECT
  w.id AS workspace_id,
  tag.slug,
  tag.label,
  'file' AS scope,
  tag.category,
  tag.color,
  true AS is_system,
  tag.sort_order
FROM public.workspaces w
CROSS JOIN (
  VALUES
    -- Status tags
    ('needs-review', 'Needs Review', 'signal', '#f59e0b', 1),
    ('approved', 'Approved', 'signal', '#22c55e', 2),
    ('pending-signature', 'Pending Signature', 'signal', '#f97316', 3),
    ('signed', 'Signed', 'signal', '#10b981', 4),
    ('expired', 'Expired', 'signal', '#ef4444', 5),
    -- Priority tags
    ('urgent', 'Urgent', 'priority', '#dc2626', 10),
    ('important', 'Important', 'priority', '#ea580c', 11),
    -- Organization tags
    ('reference', 'Reference', 'segment', '#6366f1', 20),
    ('template', 'Template', 'segment', '#8b5cf6', 21),
    ('archive', 'Archive', 'segment', '#71717a', 22)
) AS tag(slug, label, category, color, sort_order)
ON CONFLICT (workspace_id, slug) DO NOTHING;
