-- ============================================================================
-- Migration: Aggressive client_meetings RLS fix
-- ============================================================================
--
-- The previous fix may not have caught all old policies. This migration:
-- 1. Drops ALL existing RLS policies on client_meetings
-- 2. Recreates them with correct workspace naming
-- ============================================================================

-- Drop ALL policies on client_meetings (regardless of name)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'client_meetings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_meetings', pol.policyname);
  END LOOP;
END $$;

-- Recreate policies with workspace naming
CREATE POLICY "Workspace members can view their workspace meetings"
  ON public.client_meetings FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create meetings"
  ON public.client_meetings FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update their workspace meetings"
  ON public.client_meetings FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete their workspace meetings"
  ON public.client_meetings FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Client users can view meetings shared with them
CREATE POLICY "Client users can view their shared meetings"
  ON public.client_meetings FOR SELECT
  USING (
    visibility = 'shared_with_client' AND
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
  );
