-- ============================================================================
-- FIX: Remove ALL infinite recursion in RLS policies
-- ============================================================================
-- 
-- Problem: Multiple policies were creating circular dependencies:
-- 1. studios policies querying studio_members
-- 2. studio_members policies querying studio_members
-- 
-- Solution: Simplify all policies to avoid table self-references
-- ============================================================================

-- ============================================================================
-- STUDIOS TABLE FIXES
-- ============================================================================

-- Drop the problematic studios policies
drop policy if exists "Studio members can view their studio" on public.studios;
drop policy if exists "Studio owners can update their studio" on public.studios;

-- Create simpler studios policies
create policy "Studio owners can view their studio"
  on public.studios for select
  using (owner_id = auth.uid());

create policy "Studio owners can update their studio"
  on public.studios for update
  using (owner_id = auth.uid());

-- ============================================================================
-- STUDIO_MEMBERS TABLE FIXES
-- ============================================================================

-- Drop ALL existing studio_members policies
drop policy if exists "Studio members can view other members in their studio" on public.studio_members;
drop policy if exists "Studio admins can manage members" on public.studio_members;
drop policy if exists "Users can view their own studio memberships" on public.studio_members;
drop policy if exists "Users can view members in their studios" on public.studio_members;
drop policy if exists "Studio owners can manage members" on public.studio_members;

-- Create simple, non-recursive policies
-- 1. Users can see their own membership records
create policy "Users can view own membership"
  on public.studio_members for select
  using (user_id = auth.uid());

-- 2. Studio owners can see all members in their studio (checked via studios, not studio_members)
create policy "Studio owners can view all members"
  on public.studio_members for select
  using (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

-- 3. Studio owners can manage (insert/update/delete) members in their studio
create policy "Studio owners can manage members"
  on public.studio_members for insert
  with check (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

create policy "Studio owners can update members"
  on public.studio_members for update
  using (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

create policy "Studio owners can delete members"
  on public.studio_members for delete
  using (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION: All policies now avoid circular dependencies
-- Studios policies only check owner_id = auth.uid()
-- Studio_members policies check via studios table, not studio_members
-- ============================================================================

