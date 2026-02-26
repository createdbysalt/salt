-- Add direction column to client_emails
-- 'outbound' = sent by studio, 'inbound' = received from client

ALTER TABLE public.client_emails
ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound';

-- Add check constraint
ALTER TABLE public.client_emails
ADD CONSTRAINT client_emails_direction_check
CHECK (direction IN ('outbound', 'inbound'));

-- Index for finding inbound emails
CREATE INDEX IF NOT EXISTS idx_client_emails_direction
ON public.client_emails(direction)
WHERE direction = 'inbound';

COMMENT ON COLUMN public.client_emails.direction IS 'outbound = sent by studio, inbound = received from client';
