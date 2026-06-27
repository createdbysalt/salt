-- Seed default workspace project types (mirrors services signup seeding).

CREATE OR REPLACE FUNCTION public.seed_default_project_types(p_workspace_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.workspace_project_types (workspace_id, name, description, display_order)
  VALUES
    (p_workspace_id, 'Website', 'Marketing or business website', 1),
    (p_workspace_id, 'Web application', 'Custom web app or platform', 2),
    (p_workspace_id, 'Mobile app', 'iOS, Android, or cross-platform app', 3),
    (p_workspace_id, 'Branding', 'Logo, identity, or brand system', 4),
    (p_workspace_id, 'E-commerce', 'Online store or shop', 5),
    (p_workspace_id, 'Retainer', 'Ongoing monthly support or creative', 6),
    (p_workspace_id, 'Other', 'One-off or custom deliverable', 7)
  ON CONFLICT (workspace_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.seed_default_project_types(uuid) IS
  'Inserts default deliverable categories for a workspace. Idempotent via unique (workspace_id, name).';

-- Backfill existing workspaces that never received project types.
DO $$
DECLARE
  ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_project_types WHERE workspace_id = ws.id
    ) THEN
      PERFORM public.seed_default_project_types(ws.id);
    END IF;
  END LOOP;
END $$;

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
  PERFORM seed_default_project_types(new_workspace_id);

  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to create workspace for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile, workspace, membership, and default tags/services/project types on auth signup.';
