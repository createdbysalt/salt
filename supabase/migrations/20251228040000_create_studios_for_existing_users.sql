-- ============================================================================
-- Create Studio for Existing Users (One-time Data Fix)
-- ============================================================================
-- 
-- This creates studios for any existing users who don't have one yet.
-- The trigger should handle new users automatically going forward.
-- ============================================================================

-- Create studios for existing users who don't have one
insert into public.studios (owner_id, name, slug, created_at)
select 
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) || '''s Studio',
  lower(regexp_replace(
    coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), 
    '[^a-zA-Z0-9]', '-', 'g'
  )) || '-' || substr(u.id::text, 1, 8),
  u.created_at
from auth.users u
where not exists (
  select 1 from public.studios s where s.owner_id = u.id
);

-- Create studio_members for existing users who don't have membership
insert into public.studio_members (studio_id, user_id, role, email, created_at)
select 
  s.id,
  s.owner_id,
  'owner',
  u.email,
  s.created_at
from public.studios s
join auth.users u on u.id = s.owner_id
where not exists (
  select 1 from public.studio_members sm 
  where sm.studio_id = s.id and sm.user_id = s.owner_id
);

-- ============================================================================
-- DONE: All existing users now have studios
-- ============================================================================

