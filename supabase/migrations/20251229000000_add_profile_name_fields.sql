-- Add name fields to profiles table
-- This migration adds first_name, last_name, display_name, and avatar_url
-- to support richer user profiles for both studio owners and client users

-- Add new columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add index for display_name lookups (useful for search/mentions)
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.first_name IS 'User first name (optional, can be populated from OAuth)';
COMMENT ON COLUMN public.profiles.last_name IS 'User last name (optional, can be populated from OAuth)';
COMMENT ON COLUMN public.profiles.display_name IS 'User display name for The Bridge and UI (optional, defaults to first_name or email)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'User avatar/profile picture URL (can be from OAuth or uploaded)';

-- Update the handle_new_user trigger to populate name fields from OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_studio_id uuid;
  user_name text;
  studio_slug text;
  user_first_name text;
  user_last_name text;
  user_avatar text;
BEGIN
  -- Extract name from OAuth metadata
  user_first_name := new.raw_user_meta_data->>'given_name';
  user_last_name := new.raw_user_meta_data->>'family_name';
  user_avatar := new.raw_user_meta_data->>'avatar_url';
  
  -- Fallback: if no given_name/family_name, try to parse 'name' field
  IF user_first_name IS NULL AND new.raw_user_meta_data->>'name' IS NOT NULL THEN
    user_name := new.raw_user_meta_data->>'name';
    -- Simple heuristic: split on first space
    user_first_name := split_part(user_name, ' ', 1);
    IF position(' ' in user_name) > 0 THEN
      user_last_name := substring(user_name from position(' ' in user_name) + 1);
    END IF;
  END IF;
  
  -- Final fallback: use email username
  IF user_first_name IS NULL THEN
    user_first_name := split_part(new.email, '@', 1);
  END IF;
  
  -- Create profile (for Stripe/ShipFast + name fields)
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    display_name, 
    avatar_url
  )
  VALUES (
    new.id, 
    new.email,
    user_first_name,
    user_last_name,
    COALESCE(user_first_name, split_part(new.email, '@', 1)), -- display_name defaults to first_name
    user_avatar
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  
  -- Get user name for studio creation
  user_name := COALESCE(
    user_first_name,
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Generate unique studio slug
  studio_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g'));
  studio_slug := studio_slug || '-' || substr(new.id::text, 1, 8);

  -- Create studio
  INSERT INTO public.studios (owner_id, name, slug)
  VALUES (new.id, user_name || '''s Studio', studio_slug)
  RETURNING id INTO new_studio_id;

  -- Create studio_member
  INSERT INTO public.studio_members (studio_id, user_id, role, email)
  VALUES (new_studio_id, new.id, 'owner', new.email);

  RETURN new;
END;
$$;

-- Backfill existing profiles with names from auth.users metadata (best effort)
UPDATE public.profiles p
SET 
  first_name = COALESCE(
    p.first_name,
    u.raw_user_meta_data->>'given_name',
    split_part(u.raw_user_meta_data->>'name', ' ', 1),
    split_part(u.email, '@', 1)
  ),
  last_name = COALESCE(
    p.last_name,
    u.raw_user_meta_data->>'family_name',
    CASE 
      WHEN position(' ' in u.raw_user_meta_data->>'name') > 0 
      THEN substring(u.raw_user_meta_data->>'name' from position(' ' in u.raw_user_meta_data->>'name') + 1)
      ELSE NULL
    END
  ),
  display_name = COALESCE(
    p.display_name,
    u.raw_user_meta_data->>'given_name',
    split_part(u.raw_user_meta_data->>'name', ' ', 1),
    split_part(u.email, '@', 1)
  ),
  avatar_url = COALESCE(
    p.avatar_url,
    u.raw_user_meta_data->>'avatar_url'
  )
FROM auth.users u
WHERE p.id = u.id
  AND (p.first_name IS NULL OR p.display_name IS NULL OR p.avatar_url IS NULL);

-- Migration complete
COMMENT ON TABLE public.profiles IS 'User profiles with name fields populated from OAuth providers (Google, GitHub)';

