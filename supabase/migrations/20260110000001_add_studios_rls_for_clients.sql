-- ============================================================================
-- ADD RLS POLICY FOR CLIENT USERS TO VIEW STUDIOS
-- ============================================================================
-- Client users need to be able to view studios they're associated with
-- through their client membership. This is needed for messaging to work
-- properly since conversations join to the studios table.

-- Allow client users to view studios they're associated with
CREATE POLICY "Client users can view studios for their clients"
  ON public.studios FOR SELECT
  USING (
    id IN (
      SELECT cu.studio_id
      FROM public.client_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.status = 'active'
    )
  );
