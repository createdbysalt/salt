-- ============================================================================
-- RECONCILE: Update tags and tag_assignments constraints to support tasks
-- ============================================================================
-- Issue: App queries use tags.type='task' and tag_assignments.entity_type='task'
-- but DB constraints only allow 'client' and 'project'.
-- This migration adds 'task' to both constraints.
-- NOTE: Only runs if tables exist (tags feature may not be implemented yet)
-- ============================================================================

DO $$
BEGIN
  -- Only run if tags table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tags') THEN
    -- Drop existing constraints
    ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_type_check;

    -- Recreate with 'task' included
    ALTER TABLE public.tags
      ADD CONSTRAINT tags_type_check
      CHECK (type = ANY (ARRAY['client'::text, 'project'::text, 'task'::text]));

    -- Add comment for clarity
    COMMENT ON CONSTRAINT tags_type_check ON public.tags
      IS 'Tag types: client (for client tagging), project (for project tagging), task (for task tagging)';
  END IF;

  -- Only run if tag_assignments table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tag_assignments') THEN
    ALTER TABLE public.tag_assignments DROP CONSTRAINT IF EXISTS tag_assignments_entity_type_check;

    ALTER TABLE public.tag_assignments
      ADD CONSTRAINT tag_assignments_entity_type_check
      CHECK (entity_type = ANY (ARRAY['client'::text, 'project'::text, 'task'::text]));

    COMMENT ON CONSTRAINT tag_assignments_entity_type_check ON public.tag_assignments
      IS 'Entity types that can be tagged: client, project, or task';
  END IF;
END $$;

