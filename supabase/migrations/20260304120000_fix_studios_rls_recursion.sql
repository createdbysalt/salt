-- ============================================================================
-- FIX: Infinite recursion in studios RLS UPDATE policy
-- ============================================================================
--
-- Problem: The studios UPDATE policy queries studio_members, but studio_members
-- has a SELECT policy that queries studios, creating infinite recursion.
--
-- Current cycle:
--   studios UPDATE → queries studio_members
--   studio_members SELECT → queries studios
--   → INFINITE RECURSION
--
-- Solution: Use a security definer function to bypass RLS when checking
-- membership, breaking the recursive chain.
-- ============================================================================

-- Create a security definer function that checks studio membership
-- This runs with elevated privileges, bypassing RLS on studio_members
CREATE OR REPLACE FUNCTION public.is_studio_member(p_studio_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM studio_members
    WHERE studio_id = p_studio_id
    AND user_id = auth.uid()
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid) TO authenticated;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Studio members can update their studio" ON public.studios;

-- Create new policy using the security definer function
-- This breaks the recursion because is_studio_member() bypasses RLS
CREATE POLICY "Studio members can update their studio"
  ON public.studios FOR UPDATE
  USING (public.is_studio_member(id));

-- Also add WITH CHECK to ensure consistency
DROP POLICY IF EXISTS "Studio members can update their studio" ON public.studios;
CREATE POLICY "Studio members can update their studio"
  ON public.studios FOR UPDATE
  USING (public.is_studio_member(id))
  WITH CHECK (public.is_studio_member(id));

-- ============================================================================
-- VERIFICATION: Test the policy doesn't recurse
-- Run: SELECT * FROM studios WHERE id = 'your-studio-id';
-- If this returns without error, the fix worked.
-- ============================================================================
