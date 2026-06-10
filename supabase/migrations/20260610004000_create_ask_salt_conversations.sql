-- ============================================================================
-- Migration: Ask Salt conversation history
-- Persists Ramp-style chat threads per workspace member.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ask_salt_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  mode text NOT NULL DEFAULT 'ask'
    CHECK (mode IN ('ask', 'capture')),
  context jsonb,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ask_salt_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.ask_salt_conversations(id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ask_salt_messages_content_length CHECK (char_length(content) <= 20000)
);

CREATE INDEX IF NOT EXISTS idx_ask_salt_conversations_workspace_user
  ON public.ask_salt_conversations(workspace_id, user_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_ask_salt_messages_conversation_created
  ON public.ask_salt_messages(conversation_id, created_at ASC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.ask_salt_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ask_salt_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view their ask salt conversations"
  ON public.ask_salt_conversations FOR SELECT
  USING (
    user_id = auth.uid()
    AND public.is_workspace_member(workspace_id)
  );

CREATE POLICY "Workspace members can create ask salt conversations"
  ON public.ask_salt_conversations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_workspace_member(workspace_id)
  );

CREATE POLICY "Workspace members can update their ask salt conversations"
  ON public.ask_salt_conversations FOR UPDATE
  USING (
    user_id = auth.uid()
    AND public.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_workspace_member(workspace_id)
  );

CREATE POLICY "Workspace members can delete their ask salt conversations"
  ON public.ask_salt_conversations FOR DELETE
  USING (
    user_id = auth.uid()
    AND public.is_workspace_member(workspace_id)
  );

CREATE POLICY "Workspace members can view ask salt messages in their conversations"
  ON public.ask_salt_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.ask_salt_conversations c
      WHERE c.user_id = auth.uid()
        AND public.is_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY "Workspace members can insert ask salt messages in their conversations"
  ON public.ask_salt_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT c.id
      FROM public.ask_salt_conversations c
      WHERE c.user_id = auth.uid()
        AND public.is_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY "Workspace members can update ask salt messages in their conversations"
  ON public.ask_salt_messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.ask_salt_conversations c
      WHERE c.user_id = auth.uid()
        AND public.is_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY "Workspace members can delete ask salt messages in their conversations"
  ON public.ask_salt_messages FOR DELETE
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.ask_salt_conversations c
      WHERE c.user_id = auth.uid()
        AND public.is_workspace_member(c.workspace_id)
    )
  );
