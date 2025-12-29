-- ============================================================================
-- FIX: RLS policies - use direct user_id checks to avoid ALL recursion
-- ============================================================================
-- 
-- Problem: Even checking studios.owner_id causes issues because studio_members
-- table also has RLS policies, creating circular dependencies
-- 
-- Solution: For studio access, check studio_members.user_id DIRECTLY
-- This is the only table we can safely query without recursion
-- ============================================================================

-- ============================================================================
-- CLIENTS TABLE - Complete rebuild
-- ============================================================================

drop policy if exists "Client users can view their associated client" on public.clients;
drop policy if exists "Studio members can view their studio clients" on public.clients;
drop policy if exists "Studio members can manage their studio clients" on public.clients;

-- Studio members: Check via studio_members table (which has non-recursive policy)
create policy "Studio members view clients via membership"
  on public.clients for select
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio members manage clients via membership"
  on public.clients for insert
  with check (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio members update clients via membership"
  on public.clients for update
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio members delete clients via membership"
  on public.clients for delete
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

-- Client users: Direct check on client_users (which has user_id = auth.uid() policy)
create policy "Client users view their client via membership"
  on public.clients for select
  using (
    exists (
      select 1 from public.client_users cu
      where cu.client_id = clients.id
      and cu.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROJECTS TABLE - Complete rebuild
-- ============================================================================

drop policy if exists "Client users can view their associated projects" on public.projects;
drop policy if exists "Studio members can view studio projects" on public.projects;
drop policy if exists "Studio members can manage studio projects" on public.projects;

-- Studio members: Check via studio_members table
create policy "Studio members view projects via membership"
  on public.projects for select
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio members manage projects via membership"
  on public.projects for insert
  with check (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio members update projects via membership"
  on public.projects for update
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

create policy "Studio members delete projects via membership"
  on public.projects for delete
  using (
    studio_id in (
      select studio_id from public.studio_members
      where user_id = auth.uid()
    )
  );

-- Client users: Direct check on client_users
create policy "Client users view projects via membership"
  on public.projects for select
  using (
    exists (
      select 1 from public.client_users cu
      where cu.client_id = projects.client_id
      and cu.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION: This should work because:
-- 1. studio_members has a simple policy: user_id = auth.uid() (no recursion)
-- 2. client_users has a simple policy: user_id = auth.uid() (no recursion)
-- 3. clients/projects policies only query those simple tables
-- 4. No circular dependencies!
-- ============================================================================

