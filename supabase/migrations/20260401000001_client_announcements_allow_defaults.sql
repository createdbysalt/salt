-- Allow studio-wide default messages by making client_id nullable
-- When client_id IS NULL, the message is a studio default for all clients

-- Make client_id nullable
ALTER TABLE public.client_announcements
  ALTER COLUMN client_id DROP NOT NULL;

-- Add unique constraint for studio default (only one default per studio)
-- This ensures each studio can have at most one default message
CREATE UNIQUE INDEX idx_client_announcements_studio_default
  ON public.client_announcements (studio_id)
  WHERE client_id IS NULL AND dismissed_at IS NULL;

-- Add unique constraint for client-specific (only one active message per client)
CREATE UNIQUE INDEX idx_client_announcements_client_active
  ON public.client_announcements (client_id)
  WHERE client_id IS NOT NULL AND dismissed_at IS NULL;

-- Update RLS policy to allow studio members to manage default messages
DROP POLICY IF EXISTS "Studio members can manage client announcements" ON public.client_announcements;
CREATE POLICY "Studio members can manage client announcements"
  ON public.client_announcements
  FOR ALL
  TO authenticated
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

-- Update client view policy to include studio defaults
DROP POLICY IF EXISTS "Client users can view their announcements" ON public.client_announcements;
CREATE POLICY "Client users can view their announcements"
  ON public.client_announcements
  FOR SELECT
  TO authenticated
  USING (
    -- Client-specific message for their client
    client_id IN (
      SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
    )
    OR
    -- Studio default message (client_id IS NULL) for their studio
    (
      client_id IS NULL
      AND studio_id IN (
        SELECT c.studio_id
        FROM public.clients c
        JOIN public.client_users cu ON cu.client_id = c.id
        WHERE cu.user_id = auth.uid()
      )
    )
  );

-- Add comment
COMMENT ON TABLE public.client_announcements IS
  'Pinned messages from studio to client. client_id=NULL means studio-wide default.';
