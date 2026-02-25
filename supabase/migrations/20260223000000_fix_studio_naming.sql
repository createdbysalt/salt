-- ============================================================================
-- Fix Studio Naming Convention
-- ============================================================================
--
-- Previously, studio names were created as "{user_name}'s Studio".
-- This migration:
-- 1. Removes the "'s Studio" suffix from existing studios
-- 2. Updates the trigger to just use the user's name directly
-- ============================================================================

-- Step 1: Fix existing studio names by removing "'s Studio" suffix
UPDATE public.studios
SET name = regexp_replace(name, '''s Studio$', '')
WHERE name LIKE '%''s Studio';

-- Step 2: Update the trigger function to not append "'s Studio"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  studio_slug text;
  new_studio_id uuid;
  first_name text;
  last_name text;
BEGIN
  -- Extract user name
  user_name := COALESCE(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Extract first/last name for profile
  first_name := COALESCE(
    new.raw_user_meta_data->>'first_name',
    split_part(new.raw_user_meta_data->>'name', ' ', 1),
    split_part(new.email, '@', 1)
  );

  last_name := COALESCE(
    new.raw_user_meta_data->>'last_name',
    CASE
      WHEN position(' ' in COALESCE(new.raw_user_meta_data->>'name', '')) > 0
      THEN substring(new.raw_user_meta_data->>'name' from position(' ' in new.raw_user_meta_data->>'name') + 1)
      ELSE NULL
    END
  );

  -- Generate unique studio slug
  studio_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g'));
  studio_slug := studio_slug || '-' || substr(new.id::text, 1, 8);

  -- Create studio (just use user_name, no "'s Studio" suffix)
  INSERT INTO public.studios (owner_id, name, slug)
  VALUES (new.id, user_name, studio_slug)
  RETURNING id INTO new_studio_id;

  -- Create studio_member
  INSERT INTO public.studio_members (studio_id, user_id, role, email)
  VALUES (new_studio_id, new.id, 'owner', new.email);

  -- Create profile with name fields
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (new.id, first_name, last_name)
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);

  RETURN new;
END;
$$;
