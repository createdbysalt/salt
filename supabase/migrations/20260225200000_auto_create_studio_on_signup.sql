-- ============================================================================
-- Auto-Create Studio on User Signup
-- ============================================================================
--
-- Problem: The handle_new_user() trigger only creates a profile, not a studio.
-- New users after the initial migration don't get a studio automatically.
--
-- Solution: Update the trigger to also create a studio and studio_members record.
-- ============================================================================

-- Update the handle_new_user function to also create studio
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

  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create studio for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Backfill: Create studios for any existing users who don't have one
-- ============================================================================

-- Create studios for existing users without one
INSERT INTO public.studios (owner_id, name, slug)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  ) || '''s Studio',
  lower(regexp_replace(
    COALESCE(
      u.raw_user_meta_data->>'name',
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    ),
    '[^a-zA-Z0-9]', '-', 'g'
  )) || '-' || substr(u.id::text, 1, 8)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.studios s WHERE s.owner_id = u.id
);

-- Create studio_members for users who own a studio but aren't members
INSERT INTO public.studio_members (studio_id, user_id, role, email)
SELECT s.id, s.owner_id, 'owner', u.email
FROM public.studios s
JOIN auth.users u ON u.id = s.owner_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.studio_members sm
  WHERE sm.studio_id = s.id AND sm.user_id = s.owner_id
);

-- ============================================================================
-- DONE: All users now have studios, and new users will get them automatically
-- ============================================================================
