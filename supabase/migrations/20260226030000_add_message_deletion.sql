-- Add soft delete support for client_emails
-- And prepare for Bridge message deletion (delete for me / delete for everyone)

-- ============================================================================
-- 1. Add deleted_at to client_emails for soft delete
-- ============================================================================

ALTER TABLE public.client_emails
ADD COLUMN deleted_at timestamptz;

-- Index for efficient filtering of non-deleted emails
CREATE INDEX idx_client_emails_deleted_at ON public.client_emails(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.client_emails.deleted_at IS 'When the email was deleted from chat view (soft delete)';

-- ============================================================================
-- 2. Create message_deletions table for user-specific deletions
-- This supports "delete for me" where only specific users hide the message
-- ============================================================================

CREATE TABLE public.message_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who deleted this message for themselves
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reference to the message (polymorphic - can be email or bridge message)
  message_type text NOT NULL,
  message_id uuid NOT NULL,

  -- When deleted
  deleted_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure a user can only delete a message once
  CONSTRAINT message_deletions_unique UNIQUE (user_id, message_type, message_id),

  -- Valid message types
  CONSTRAINT message_deletions_type_check CHECK (
    message_type IN ('email', 'bridge')
  )
);

-- Indexes
CREATE INDEX idx_message_deletions_user_id ON public.message_deletions(user_id);
CREATE INDEX idx_message_deletions_message ON public.message_deletions(message_type, message_id);

-- RLS
ALTER TABLE public.message_deletions ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own deletions
CREATE POLICY "Users can view their own deletions"
  ON public.message_deletions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own deletions"
  ON public.message_deletions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own deletions"
  ON public.message_deletions FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON TABLE public.message_deletions IS 'Tracks user-specific message deletions (delete for me)';
