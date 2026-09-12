-- GMAIL_GET_ATTACHMENT: read-class download of one email attachment by id.
-- Powers email-attachment ingestion (2026-09-08): document-class attachments
-- (agreements/contracts/SOWs/proposals/invoices) are downloaded to storage so
-- content analysis reads the actual document, not the email excerpt.

INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('GMAIL_GET_ATTACHMENT', 'read', false, 'approved', 'seed', now(), 'Email attachment download for document ingestion (audited 2026-09-08)')
ON CONFLICT (tool_slug) DO NOTHING;
