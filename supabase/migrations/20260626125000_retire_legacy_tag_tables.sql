-- ============================================================================
-- Retire legacy Studio/Bridge tag and portfolio taxonomy tables
-- ============================================================================
--
-- Context: Phase 1 removed app code for client/project/services/portfolio tags.
-- Memory people/org tags will be rebuilt on a fresh schema. File tags
-- (file_tags, file_tag_assignments) are intentionally kept for /files.
--
-- Safe on environments where tables were never created (IF EXISTS throughout).
-- ============================================================================

-- studio_services is a compatibility view over workspace_services; drop before column changes
DROP VIEW IF EXISTS public.studio_services;

-- Detach workspace_services from retired services-catalog tag IDs
ALTER TABLE public.workspace_services
  DROP COLUMN IF EXISTS feature_tag_ids,
  DROP COLUMN IF EXISTS deliverable_tag_ids;

-- Recreate deprecated studio_services view without retired tag ID columns
DO $$
DECLARE
  select_list text;
BEGIN
  IF to_regclass('public.workspace_services') IS NOT NULL THEN
    SELECT string_agg(
      CASE
        WHEN column_name = 'workspace_id' THEN format('%I AS studio_id', column_name)
        ELSE format('%I', column_name)
      END,
      ', ' ORDER BY ordinal_position
    )
    INTO select_list
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspace_services';

    EXECUTE format(
      'CREATE VIEW public.studio_services WITH (security_invoker = true) AS SELECT %s FROM public.workspace_services',
      select_list
    );

    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_services TO authenticated';
  END IF;
END $$;

-- Stop seeding retired tag tables on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_workspace_id uuid;
  workspace_name text;
  workspace_slug text;
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  workspace_name := COALESCE(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  ) || '''s Workspace';

  workspace_slug := lower(regexp_replace(
    COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    '[^a-zA-Z0-9]', '-', 'g'
  )) || '-' || substr(new.id::text, 1, 8);

  INSERT INTO public.workspaces (owner_id, name, slug)
  VALUES (new.id, workspace_name, workspace_slug)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, email)
  VALUES (new_workspace_id, new.id, 'owner', new.email);

  PERFORM seed_default_services(new_workspace_id);

  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to create workspace for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile, workspace, membership, and default services on auth signup.';

DROP FUNCTION IF EXISTS public.seed_default_tags(uuid);
DROP FUNCTION IF EXISTS public.seed_client_and_project_tags(uuid);

-- Compatibility views must be dropped before underlying tables
DROP VIEW IF EXISTS public.studio_portfolio_client_tags;
DROP VIEW IF EXISTS public.studio_portfolio_project_tags;
DROP VIEW IF EXISTS public.studio_portfolio_item_tags;
DROP VIEW IF EXISTS public.studio_portfolio_tags;
DROP VIEW IF EXISTS public.studio_portfolio_items;
DROP VIEW IF EXISTS public.studio_client_tags;
DROP VIEW IF EXISTS public.studio_project_tags;
DROP VIEW IF EXISTS public.studio_tags;
DROP VIEW IF EXISTS public.studio_portfolio;

-- Junction / assignment tables
DROP TABLE IF EXISTS public.workspace_portfolio_client_tags;
DROP TABLE IF EXISTS public.workspace_portfolio_project_tags;
DROP TABLE IF EXISTS public.workspace_portfolio_item_tags;
DROP TABLE IF EXISTS public.client_tags;
DROP TABLE IF EXISTS public.tag_assignments;

-- Tag and portfolio taxonomy tables (Bridge / Studio era)
DROP TABLE IF EXISTS public.workspace_portfolio_items;
DROP TABLE IF EXISTS public.workspace_portfolio_tags;
DROP TABLE IF EXISTS public.workspace_client_tags;
DROP TABLE IF EXISTS public.workspace_project_tags;
DROP TABLE IF EXISTS public.workspace_tags;
DROP TABLE IF EXISTS public.tags;

-- Legacy case-study portfolio (superseded; no app references)
DROP TABLE IF EXISTS public.workspace_portfolio;
