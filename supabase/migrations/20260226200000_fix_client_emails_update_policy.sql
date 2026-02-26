-- Fix RLS policy for client_emails to allow marking ANY email as read
-- The previous policy only allowed updating emails where sender_id = auth.uid()
-- But inbound emails have sender_id = NULL, so they couldn't be marked as read

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Studio members can update their own emails" ON public.client_emails;

-- Create a new policy that allows studio members to update ANY email in their studio
-- This is needed for marking inbound emails as read
CREATE POLICY "Studio members can update client emails"
  ON public.client_emails FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
  );
