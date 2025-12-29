-- ============================================================================
-- FIX: Complete RLS policy overhaul for projects table
-- ============================================================================
-- 
-- Problem: Projects policies might have recursion through clients table
-- 
-- Solution: Drop ALL policies and recreate them cleanly
-- ============================================================================

-- Drop ALL existing policies on projects table
drop policy if exists "Client users can view their client projects" on public.projects;
drop policy if exists "Studio members can view their projects" on public.projects;
drop policy if exists "Client users can view their projects" on public.projects;
drop policy if exists "Studio members can manage their projects" on public.projects;

-- ============================================================================
-- RECREATE POLICIES (clean, no recursion)
-- ============================================================================

-- Policy 1: Studio members can view their projects (direct studio_id check)
create policy "Studio members can view studio projects"
  on public.projects for select
  using (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

-- Policy 2: Studio members can manage their projects
create policy "Studio members can manage studio projects"
  on public.projects for all
  using (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

-- Policy 3: Client users can view projects for their client (direct client_users check)
create policy "Client users can view their associated projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.client_users cu
      where cu.client_id = projects.client_id
      and cu.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION: Policies are now non-recursive
-- - Studio policies check studios.owner_id directly
-- - Client policy checks client_users directly (no clients table involved)
-- - No circular dependencies
-- ============================================================================

