-- Add column to store RFC 2822 Message-ID header for proper email threading
-- Gmail requires the In-Reply-To header to contain the actual Message-ID, not the Gmail message ID

ALTER TABLE public.client_emails
ADD COLUMN IF NOT EXISTS message_id_header text;

COMMENT ON COLUMN public.client_emails.message_id_header IS 'RFC 2822 Message-ID header (e.g., <unique-id@mail.gmail.com>). Required for proper Gmail threading via In-Reply-To header.';

-- Create index for lookups when building reply chains
CREATE INDEX IF NOT EXISTS client_emails_message_id_header_idx ON public.client_emails(message_id_header);
