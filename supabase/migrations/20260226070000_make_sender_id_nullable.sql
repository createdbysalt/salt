-- Make sender_id nullable for inbound emails
-- Inbound emails (client replies) don't have a Salt Core user as sender

ALTER TABLE public.client_emails
ALTER COLUMN sender_id DROP NOT NULL;

COMMENT ON COLUMN public.client_emails.sender_id IS 'Salt Core user who sent the email. NULL for inbound emails (client replies).';
