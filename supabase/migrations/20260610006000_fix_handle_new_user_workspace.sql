-- ============================================================================
-- Fix signup workspace provisioning after studios → workspaces rename
-- ============================================================================
--
-- handle_new_user() still inserted into studio-named compatibility views.
-- Those views alias workspace_id as studio_id, so INSERT fails silently in the
-- EXCEPTION handler — users authenticate but have no workspace_members row.
-- ============================================================================

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

-- Backfill: workspaces for auth users missing tenant membership
INSERT INTO public.workspaces (owner_id, name, slug, created_at)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  ) || '''s Workspace',
  lower(regexp_replace(
    COALESCE(
      u.raw_user_meta_data->>'name',
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    ),
    '[^a-zA-Z0-9]', '-', 'g'
  )) || '-' || substr(u.id::text, 1, 8),
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspace_members wm
  WHERE wm.user_id = u.id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.workspaces w
  WHERE w.owner_id = u.id
);

INSERT INTO public.workspace_members (workspace_id, user_id, role, email, created_at)
SELECT
  w.id,
  w.owner_id,
  'owner',
  u.email,
  w.created_at
FROM public.workspaces w
JOIN auth.users u ON u.id = w.owner_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspace_members wm
  WHERE wm.workspace_id = w.id
    AND wm.user_id = w.owner_id
);

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile, workspace, membership, and default tags/services on auth signup.';
