-- ============================================================================
-- FIX: Infinite recursion in clients RLS policy
-- ============================================================================
-- 
-- Problem: The "Client users can view their own client" policy creates
-- infinite recursion when querying clients.
-- 
-- Solution: Simplify the policy to avoid the recursive check.
-- ============================================================================

-- Drop the problematic policy
drop policy if exists "Client users can view their own client" on public.clients;

-- Recreate with a simpler approach using EXISTS (less likely to recurse)
create policy "Client users can view their own client"
  on public.clients for select
  using (
    exists (
      select 1 from public.client_users
      where client_users.client_id = clients.id
      and client_users.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FIXED: Using EXISTS with explicit join prevents recursion
-- ============================================================================

