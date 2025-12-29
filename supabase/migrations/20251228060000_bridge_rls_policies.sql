-- ============================================================================
-- BRIDGE RLS POLICIES
-- Migration: Add RLS policies for client_users to access their client + projects
-- ============================================================================
-- 
-- This migration adds non-recursive RLS policies to allow client_users to:
-- - Read their own client record
-- - Read projects that belong to their client
-- - Read their own client_user membership
-- 
-- Studio members retain their existing access (separate policies).
-- ============================================================================

-- ============================================================================
-- CLIENTS TABLE: Allow client_users to read their client
-- ============================================================================

create policy "Client users can view their own client"
  on public.clients for select
  using (
    id in (
      select client_id from public.client_users
      where user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROJECTS TABLE: Allow client_users to read their client's projects
-- ============================================================================

create policy "Client users can view their client projects"
  on public.projects for select
  using (
    client_id in (
      select client_id from public.client_users
      where user_id = auth.uid()
    )
  );

-- ============================================================================
-- CLIENT_USERS TABLE: Allow users to view their own membership
-- ============================================================================

create policy "Users can view their own client memberships"
  on public.client_users for select
  using (user_id = auth.uid());

-- ============================================================================
-- BRIDGE_PORTALS TABLE: Allow client_users to read their portal config
-- ============================================================================

create policy "Client users can view their bridge portal"
  on public.bridge_portals for select
  using (
    client_id in (
      select client_id from public.client_users
      where user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION: All policies are non-recursive
-- - client_users policies check user_id directly (no recursion)
-- - Other policies query client_users (non-recursive helper table)
-- ============================================================================

