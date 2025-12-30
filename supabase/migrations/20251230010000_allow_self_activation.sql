-- Allow client users to activate their own pending memberships
-- This is needed for the magic link verification flow

-- Add policy for users to update their own client_users status from pending to active
CREATE POLICY "Users can activate their own pending memberships"
  ON public.client_users FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'active'
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can activate their own pending memberships" ON public.client_users 
IS 'Allows users to change their own status from pending to active when they click the invite link';

