-- Create client_announcements table for pinned messages from studio to clients
-- These appear on the Bridge overview page as "Message from your team"

CREATE TABLE public.client_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  expires_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_client_announcements_client ON public.client_announcements(client_id);
CREATE INDEX idx_client_announcements_studio ON public.client_announcements(studio_id);
CREATE INDEX idx_client_announcements_active ON public.client_announcements(client_id)
  WHERE dismissed_at IS NULL;

-- Enable RLS
ALTER TABLE public.client_announcements ENABLE ROW LEVEL SECURITY;

-- Studio members can manage announcements for their studio's clients
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

-- Client users can view announcements for their client
CREATE POLICY "Client users can view their announcements"
  ON public.client_announcements
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
    )
  );

-- Client users can dismiss their announcements
CREATE POLICY "Client users can dismiss their announcements"
  ON public.client_announcements
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_client_announcements_updated_at
  BEFORE UPDATE ON public.client_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add comment
COMMENT ON TABLE public.client_announcements IS
  'Pinned messages from studio to client, shown on Bridge overview';
