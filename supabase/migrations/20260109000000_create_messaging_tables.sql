-- ============================================================================
-- CREATE: Messaging Tables (conversations and messages)
-- ============================================================================
-- Powers real-time messaging between studio users and clients.
-- Supports dashboard /messages and Bridge /messages sections.
-- Uses Supabase Realtime for live message updates.
-- ============================================================================

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
-- Each conversation is between a studio and a client.
-- The studio_id is denormalized for efficient RLS (same pattern as client_meetings, tasks).

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Metadata for list view (updated by trigger on new messages)
  last_message_at timestamptz,
  last_message_preview text,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- One conversation per studio-client pair
  CONSTRAINT conversations_studio_client_unique UNIQUE (studio_id, client_id)
);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Individual messages within a conversation.
-- sender_type distinguishes between studio users and client users.

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  content text NOT NULL,

  -- Read tracking
  read_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT messages_sender_type_check CHECK (
    sender_type IN ('studio_user', 'client_user')
  ),
  CONSTRAINT messages_content_length CHECK (
    char_length(content) <= 5000
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Conversations: Query by studio (dashboard messages list)
CREATE INDEX idx_conversations_studio_id
  ON public.conversations(studio_id);

-- Conversations: Query by client (Bridge messages list)
CREATE INDEX idx_conversations_client_id
  ON public.conversations(client_id);

-- Conversations: Sort by most recent message
CREATE INDEX idx_conversations_last_message_at
  ON public.conversations(studio_id, last_message_at DESC);

-- Messages: Query by conversation + chronological order
CREATE INDEX idx_messages_conversation_created
  ON public.messages(conversation_id, created_at DESC);

-- Messages: Unread count queries (null read_at = unread)
CREATE INDEX idx_messages_unread
  ON public.messages(conversation_id, sender_id, read_at)
  WHERE read_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONVERSATIONS RLS POLICIES
-- ============================================================================

-- Studio members can view conversations for their studio
CREATE POLICY "Studio members can view their studio conversations"
  ON public.conversations FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can create conversations for their studio
CREATE POLICY "Studio members can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Studio members can update their studio conversations
CREATE POLICY "Studio members can update their studio conversations"
  ON public.conversations FOR UPDATE
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

-- Client users can view conversations for their client (if active)
CREATE POLICY "Client users can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Client users can create conversations for their client (if active)
CREATE POLICY "Client users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Client users can update their conversations (if active)
CREATE POLICY "Client users can update their conversations"
  ON public.conversations FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- ============================================================================
-- MESSAGES RLS POLICIES
-- ============================================================================

-- Studio members can view messages in their studio's conversations
CREATE POLICY "Studio members can view their studio messages"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Studio members can insert messages in their studio's conversations
CREATE POLICY "Studio members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
      )
    )
    AND sender_id = auth.uid()
  );

-- Studio members can update messages (for marking as read)
CREATE POLICY "Studio members can update messages"
  ON public.messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.studio_id IN (
        SELECT studio_id FROM public.studio_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Client users can view messages in their conversations (if active)
CREATE POLICY "Client users can view their messages"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
          AND status = 'active'
      )
    )
  );

-- Client users can insert messages in their conversations (if active)
CREATE POLICY "Client users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
          AND status = 'active'
      )
    )
    AND sender_id = auth.uid()
  );

-- Client users can update messages (for marking as read)
CREATE POLICY "Client users can update messages"
  ON public.messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.client_id IN (
        SELECT client_id FROM public.client_users
        WHERE user_id = auth.uid()
          AND status = 'active'
      )
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update conversations.updated_at on changes
CREATE OR REPLACE FUNCTION public.update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversations_updated_at();

-- Update conversation metadata when a new message is inserted
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_new_message();

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

-- Enable Realtime for messaging tables to support live updates
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.conversations IS 'Conversations between studios and clients for the messaging system';
COMMENT ON COLUMN public.conversations.last_message_at IS 'Timestamp of the most recent message, updated by trigger';
COMMENT ON COLUMN public.conversations.last_message_preview IS 'First 100 chars of the most recent message, for list preview';

COMMENT ON TABLE public.messages IS 'Individual messages within conversations, with Realtime enabled for live updates';
COMMENT ON COLUMN public.messages.sender_type IS 'Whether sender is a studio_user or client_user';
COMMENT ON COLUMN public.messages.read_at IS 'Timestamp when message was read, null if unread';
COMMENT ON COLUMN public.messages.content IS 'Message content, max 5000 characters';
