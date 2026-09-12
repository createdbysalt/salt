-- Message store (Memory Sourcing Overhaul, Phase 2)
--
-- A learn-layer message store: normalized, threaded message rows with capped
-- plain-text bodies. Writers: the capture ingest pipeline (message-type
-- captures). Readers: memory evidence extraction, the capture-intelligence
-- scan, and the Convos surface (read-only). Bodies are extraction fuel, not
-- an archive — body_text carries a TTL and is purged by
-- purge_expired_conversation_bodies() (called from the nightly
-- capture-evidence-backfill cron); thread metadata persists.

CREATE TABLE public.conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Null until the counterparty is born as a Memory record; resolved on
  -- record birth (auto-create-record) and by later matching.
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  -- Lowercased counterparty address/handle — lets record birth resolve
  -- person-null threads without scanning message rows.
  counterparty_email text,
  -- Channel vocabulary matches the Convos surface (email, slack, ...).
  channel text NOT NULL,
  -- Registry provider key (gmail, outlook, slack).
  provider text NOT NULL,
  -- Provider-side grouping id (email thread_id, Slack channel). Writers fall
  -- back to the first message's external id when the provider gives none.
  external_thread_id text NOT NULL,
  subject text,
  last_message_at timestamptz,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider, external_thread_id)
);

CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  -- Nullable: the message survives capture-row cleanup; SET NULL keeps history.
  capture_event_id uuid REFERENCES public.capture_events(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  author_email text,
  author_name text,
  -- Capped plain text (~10k chars enforced by the writer). NULL after TTL
  -- purge — the row and its metadata persist.
  body_text text,
  body_expires_at timestamptz,
  occurred_at timestamptz,
  source_type text NOT NULL,
  source_external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Idempotent ingest: same dedupe identity as capture_events.
  UNIQUE (workspace_id, source_type, source_external_id)
);

-- Indexes
CREATE INDEX conversation_threads_workspace_id_idx ON public.conversation_threads(workspace_id);
CREATE INDEX conversation_threads_person_id_idx ON public.conversation_threads(person_id);
CREATE INDEX conversation_threads_counterparty_email_idx ON public.conversation_threads(workspace_id, counterparty_email)
  WHERE person_id IS NULL;
CREATE INDEX conversation_threads_last_message_at_idx ON public.conversation_threads(workspace_id, last_message_at DESC);
CREATE INDEX conversation_messages_workspace_id_idx ON public.conversation_messages(workspace_id);
CREATE INDEX conversation_messages_thread_id_idx ON public.conversation_messages(thread_id, occurred_at);
CREATE INDEX conversation_messages_capture_event_id_idx ON public.conversation_messages(capture_event_id);
CREATE INDEX conversation_messages_body_expires_at_idx ON public.conversation_messages(body_expires_at)
  WHERE body_text IS NOT NULL;

-- RLS
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_conversation_threads" ON public.conversation_threads
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_manage_conversation_threads" ON public.conversation_threads
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "workspace_members_view_conversation_messages" ON public.conversation_messages
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_manage_conversation_messages" ON public.conversation_messages
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Grants (required in the same migration — see supabase/CLAUDE.md)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_messages TO service_role;

DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.conversation_threads', 'SELECT') THEN
    RAISE EXCEPTION 'service_role still lacks SELECT on conversation_threads';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.conversation_messages', 'SELECT') THEN
    RAISE EXCEPTION 'service_role still lacks SELECT on conversation_messages';
  END IF;
END $$;

-- Body TTL purge: NULLs expired bodies. Metadata rows persist. Service-role
-- only; invoked by the nightly capture-evidence-backfill cron.
CREATE OR REPLACE FUNCTION public.purge_expired_conversation_bodies()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH purged AS (
    UPDATE public.conversation_messages
    SET body_text = NULL
    WHERE body_text IS NOT NULL
      AND body_expires_at IS NOT NULL
      AND body_expires_at < now()
    RETURNING id
  )
  SELECT count(*)::integer FROM purged;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_conversation_bodies() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_conversation_bodies() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_conversation_bodies() TO service_role;

-- Rollback:
-- DROP FUNCTION public.purge_expired_conversation_bodies();
-- DROP TABLE public.conversation_messages;
-- DROP TABLE public.conversation_threads;
