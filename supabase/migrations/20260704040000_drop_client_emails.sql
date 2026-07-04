-- ============================================================================
-- DROP client_emails + email_file_attachments (connector-platform Phase 6.2)
-- ============================================================================
--
-- Native Gmail pipeline retired 2026-07-03 (Phase 1.4): Composio triggers +
-- the capture envelope pipeline are the only email ingestion. client_emails
-- had been FROZEN since then (zero writers); its last readers — the HQ inbox
-- email source (getUnreadEmails) and the markAsRead/markAsUnread source-table
-- branches — were retired in this PR. Emails are not a memory record: they
-- flow INTO memory via capture (naming canon). A future conversations
-- memory-type rebuild sources from capture, not from this mirror.
--
-- Also drops in the same wave:
--   * email_file_attachments — zero app-code references (generated types
--     only); its email_id FK cascades from client_emails anyway.
--   * project_files.source_email_id — FK column pointing at the dropped
--     table; its only reader was the inbox attachments fetch retired here.
--
-- Zero app-code references after the sweep (import + PostgREST embedded-join
-- rg sweeps: `client_emails` / `email_file_attachments` / `source_email_id`
-- match only generated types).
--
-- Row exports (drop protocol): .backups/pre-drop-client_emails-<ref>-<date>.json
-- from BOTH projects before push (test data only on both).
--
-- Guard: the drop_bridge_tables incident (2026-07-03) left an orphaned
-- trigger on auth.users referencing a dropped table and broke all logins.
-- Scan trigger-function bodies for references to the tables being dropped
-- and abort if any live outside the tables themselves.
-- ============================================================================

DO $$
DECLARE
  offender RECORD;
BEGIN
  FOR offender IN
    SELECT DISTINCT
      trg.tgname,
      cls.relname AS table_name,
      pro.proname AS function_name
    FROM pg_trigger trg
    JOIN pg_class cls ON cls.oid = trg.tgrelid
    JOIN pg_proc pro ON pro.oid = trg.tgfoid
    WHERE NOT trg.tgisinternal
      AND cls.relname NOT IN ('client_emails', 'email_file_attachments')
      AND (
        pro.prosrc ILIKE '%client_emails%'
        OR pro.prosrc ILIKE '%email_file_attachments%'
      )
  LOOP
    RAISE EXCEPTION
      'Trigger % on table % (function %) references a table being dropped — review before dropping',
      offender.tgname, offender.table_name, offender.function_name;
  END LOOP;
END $$;

-- FK column into the dropped table (reader retired with the inbox email source)
ALTER TABLE public.project_files DROP COLUMN IF EXISTS source_email_id;

-- Attachment join table (email_id FK would cascade regardless; explicit for clarity)
DROP TABLE IF EXISTS public.email_file_attachments CASCADE;

-- Frozen Gmail mirror (integration plumbing, never a memory record)
DROP TABLE IF EXISTS public.client_emails CASCADE;
