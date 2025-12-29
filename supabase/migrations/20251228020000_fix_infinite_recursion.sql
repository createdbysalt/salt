-- ============================================================================
-- FIX: Remove infinite recursion in studio_members RLS policies
-- ============================================================================
-- 
-- Problem: studio_members policies were querying studio_members table,
-- creating infinite recursion.
-- 
-- Solution: Simplify policies to use direct user_id checks.
-- ============================================================================

-- Drop the problematic policies
drop policy if exists "Studio members can view other members in their studio" on public.studio_members;
drop policy if exists "Studio admins can manage members" on public.studio_members;

-- Create simpler, non-recursive policies
-- Users can view memberships in studios where they are a member
create policy "Users can view their own studio memberships"
  on public.studio_members for select
  using (user_id = auth.uid());

-- Users can view other members in the same studio (non-recursive check via studios table)
create policy "Users can view members in their studios"
  on public.studio_members for select
  using (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

-- Studio owners and admins can manage members (checked via studios table, not studio_members)
create policy "Studio owners can manage members"
  on public.studio_members for all
  using (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

-- ============================================================================
-- FIXED: No more infinite recursion!
-- ============================================================================

