-- ============================================================================
-- Simplify Studios RLS Policy
-- ============================================================================
-- Temporarily simplify the UPDATE policy to allow any studio member to update.
-- This is a temporary measure while the settings feature is in development.
-- ============================================================================

-- Drop the restrictive owner-only UPDATE policy
DROP POLICY IF EXISTS "Studio owners can update their studio" ON public.studios;

-- Create a simpler policy that allows any studio member to update their studio
CREATE POLICY "Studio members can update their studio"
  ON public.studios FOR UPDATE
  USING (
    id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );
