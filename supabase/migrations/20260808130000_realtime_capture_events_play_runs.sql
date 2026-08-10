-- Enable realtime for capture_events + play_runs (Sources plan 2.3)
--
-- The Sources Activity stream subscribes to capture_events changes
-- (useCaptureStreamRealtime) and Plays subscribes to play_runs
-- (usePlayRunsRealtime). Neither table was ever added to the
-- supabase_realtime publication, so both subscriptions silently no-op.
-- Guarded like 20260110000000_add_conversations_realtime.sql.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'capture_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.capture_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'play_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.play_runs;
  END IF;
END $$;
