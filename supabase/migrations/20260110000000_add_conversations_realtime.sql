-- ============================================================================
-- ADD CONVERSATIONS TABLE TO REALTIME PUBLICATION
-- ============================================================================
-- This migration adds the conversations table to the Supabase Realtime publication
-- to enable live updates for conversation list changes (new messages, etc.)

-- Add conversations table to realtime publication
-- Using IF NOT EXISTS equivalent via DO block to avoid errors if already added
DO $$
BEGIN
  -- Check if conversations is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    RAISE NOTICE 'Added conversations table to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'conversations table already in supabase_realtime publication';
  END IF;
END $$;
