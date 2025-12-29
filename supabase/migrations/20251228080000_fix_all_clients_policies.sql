-- ============================================================================
-- FIX: Complete RLS policy overhaul for clients table
-- ============================================================================
-- 
-- Problem: Multiple policies on clients table causing infinite recursion
-- 
-- Solution: Drop ALL policies and recreate them cleanly with no recursion
-- ============================================================================

-- Drop ALL existing policies on clients table
drop policy if exists "Client users can view their own client" on public.clients;
drop policy if exists "Studio members can view their clients" on public.clients;
drop policy if exists "Studio members can manage their clients" on public.clients;

-- ============================================================================
-- RECREATE POLICIES (clean, no recursion)
-- ============================================================================

-- Policy 1: Studio members can view clients (via studios table, not client_users)
create policy "Studio members can view their studio clients"
  on public.clients for select
  using (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

-- Policy 2: Studio members can insert/update/delete their clients
create policy "Studio members can manage their studio clients"
  on public.clients for all
  using (
    studio_id in (
      select id from public.studios
      where owner_id = auth.uid()
    )
  );

-- Policy 3: Client users can view their own client (using EXISTS to prevent recursion)
create policy "Client users can view their associated client"
  on public.clients for select
  using (
    exists (
      select 1 from public.client_users cu
      where cu.client_id = clients.id
      and cu.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION: Policies are now non-recursive
-- - Studio policies check studios.owner_id directly
-- - Client policy uses EXISTS with explicit join
-- - No policy references clients table inside clients policy
-- ============================================================================

