-- Create client_emails table for tracking emails sent to clients
-- This is separate from the Bridge messaging system

CREATE TABLE public.client_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Sender (studio user)
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_email text NOT NULL,

  -- Recipient (client contact)
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,

  -- Email content
  subject text NOT NULL,
  content text NOT NULL,

  -- Gmail tracking
  gmail_message_id text,
  gmail_thread_id text,

  -- Status tracking
  status text NOT NULL DEFAULT 'sent',
  read_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT client_emails_status_check CHECK (
    status IN ('sending', 'sent', 'delivered', 'read', 'failed')
  ),
  CONSTRAINT client_emails_content_length CHECK (
    char_length(content) <= 10000
  )
);

-- Indexes for efficient querying
CREATE INDEX idx_client_emails_client_id ON public.client_emails(client_id);
CREATE INDEX idx_client_emails_studio_id ON public.client_emails(studio_id);
CREATE INDEX idx_client_emails_sender_id ON public.client_emails(sender_id);
CREATE INDEX idx_client_emails_recipient_email ON public.client_emails(recipient_email);
CREATE INDEX idx_client_emails_created_at ON public.client_emails(created_at DESC);
CREATE INDEX idx_client_emails_gmail_thread ON public.client_emails(gmail_thread_id) WHERE gmail_thread_id IS NOT NULL;

-- RLS Policies
ALTER TABLE public.client_emails ENABLE ROW LEVEL SECURITY;

-- Studio members can view/create emails for their studio's clients
CREATE POLICY "Studio members can view client emails"
  ON public.client_emails FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio members can create client emails"
  ON public.client_emails FOR INSERT
  WITH CHECK (
    studio_id IN (
      SELECT studio_id FROM public.studio_members WHERE user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Studio members can update their own emails"
  ON public.client_emails FOR UPDATE
  USING (
    sender_id = auth.uid()
  )
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_emails;

COMMENT ON TABLE public.client_emails IS 'Tracks emails sent to clients from the communication tab';
