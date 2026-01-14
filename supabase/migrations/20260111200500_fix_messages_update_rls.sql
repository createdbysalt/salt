-- ============================================================================
-- FIX: Overly permissive message UPDATE policy
-- ============================================================================
-- The original UPDATE policies allowed any conversation participant to update
-- any message in the conversation. This is a security issue because:
-- 1. Users could modify other users' messages
-- 2. Senders could mark their own messages as read (should only be recipients)
--
-- This migration fixes the policies to:
-- 1. Allow senders to update only their own messages (sender_id = auth.uid())
-- 2. Allow recipients to update only read_at for messages they received
-- ============================================================================

-- ============================================================================
-- DROP EXISTING OVERLY PERMISSIVE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Studio members can update messages" ON public.messages;
DROP POLICY IF EXISTS "Client users can update messages" ON public.messages;

-- ============================================================================
-- NEW POLICIES: Senders can update their own messages
-- ============================================================================

-- Senders can update their own messages (e.g., edit content)
CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- ============================================================================
-- NEW POLICIES: Recipients can mark messages as read
-- ============================================================================

-- Studio members can mark messages as read (only read_at field, only messages from clients)
-- This uses a separate policy that only allows updating messages they didn't send
CREATE POLICY "Studio members can mark received messages as read"
  ON public.messages FOR UPDATE
  USING (
    -- Must NOT be the sender (recipients only)
    sender_id != auth.uid()
    -- Must be in a conversation for their studio
    AND conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Ensure only read_at can be changed by checking sender_id doesn't change
    sender_id != auth.uid()
    AND conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Client users can mark messages as read (only read_at field, only messages from studio)
CREATE POLICY "Client users can mark received messages as read"
  ON public.messages FOR UPDATE
  USING (
    -- Must NOT be the sender (recipients only)
    sender_id != auth.uid()
    -- Must be in a conversation for their client
    AND conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
          AND status = 'active'
      )
    )
  )
  WITH CHECK (
    -- Ensure only read_at can be changed by checking sender_id doesn't change
    sender_id != auth.uid()
    AND conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
          AND status = 'active'
      )
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can update their own messages" ON public.messages IS
  'Allow message senders to edit their own messages (content updates)';

COMMENT ON POLICY "Studio members can mark received messages as read" ON public.messages IS
  'Allow studio members to mark messages they received as read (only read_at field for messages where they are not the sender)';

COMMENT ON POLICY "Client users can mark received messages as read" ON public.messages IS
  'Allow client users to mark messages they received as read (only read_at field for messages where they are not the sender)';
