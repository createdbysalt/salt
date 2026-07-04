-- ============================================================================
-- Migration: Fix client_meetings RLS policies after workspace rename
-- ============================================================================
--
-- The original client_meetings RLS policies reference studio_id and
-- studio_members, but the columns were renamed to workspace_id and the
-- table to workspace_members. This migration recreates the policies with
-- the correct column and table names.
-- ============================================================================

-- Drop existing policies that reference old names
DROP POLICY IF EXISTS "Studio members can view their studio meetings" ON public.client_meetings;
DROP POLICY IF EXISTS "Studio members can create meetings" ON public.client_meetings;
DROP POLICY IF EXISTS "Studio members can update their studio meetings" ON public.client_meetings;
DROP POLICY IF EXISTS "Studio members can delete their studio meetings" ON public.client_meetings;
DROP POLICY IF EXISTS "Clients can view their meetings" ON public.client_meetings;

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
CREATE POLICY "Client users can view their meetings"
  ON public.client_meetings FOR SELECT
  USING (
    visibility = 'shared_with_client' AND
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
    )
  );
