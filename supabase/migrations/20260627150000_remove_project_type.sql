-- Remove work project_type column and workspace_project_types taxonomy.

ALTER TABLE public.projects DROP COLUMN IF EXISTS project_type;

DROP TABLE IF EXISTS public.workspace_project_types CASCADE;

DROP FUNCTION IF EXISTS public.seed_default_project_types(uuid);

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

  PERFORM seed_default_tags(new_workspace_id);
  PERFORM seed_default_services(new_workspace_id);

  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to create workspace for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile, workspace, membership, and default tags/services on auth signup.';
