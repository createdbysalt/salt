-- ============================================================================
-- Auto-Seed Default Services on Studio Creation
-- ============================================================================
--
-- Problem: Users must manually click "Use Templates" to get services.
-- Solution: Automatically seed default services when a studio is created.
-- ============================================================================

-- Update handle_new_user to also seed default services
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_studio_id uuid;
  studio_name text;
  studio_slug text;
BEGIN
  -- Create profile (existing behavior)
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  -- Generate studio name and slug from user metadata or email
  studio_name := COALESCE(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  ) || '''s Studio';

  studio_slug := lower(regexp_replace(
    COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    '[^a-zA-Z0-9]', '-', 'g'
  )) || '-' || substr(new.id::text, 1, 8);

  -- Create studio for the new user
  INSERT INTO public.studios (owner_id, name, slug)
  VALUES (new.id, studio_name, studio_slug)
  RETURNING id INTO new_studio_id;

  -- Add user as owner of their studio
  INSERT INTO public.studio_members (studio_id, user_id, role, email)
  VALUES (new_studio_id, new.id, 'owner', new.email);

  -- Seed default tags for the new studio
  PERFORM seed_default_tags(new_studio_id);

  -- Seed default services for the new studio
  PERFORM seed_default_services(new_studio_id);

  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create studio for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Backfill: Seed default services for existing studios that don't have any
-- ============================================================================

DO $$
DECLARE
  studio_record RECORD;
BEGIN
  FOR studio_record IN
    SELECT s.id
    FROM public.studios s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.studio_services svc WHERE svc.studio_id = s.id
    )
  LOOP
    PERFORM seed_default_services(studio_record.id);
  END LOOP;
END $$;
