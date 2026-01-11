-- Add last_seen_at column to profiles for activity tracking
-- Used to determine when to send email notifications for new messages

-- Add last_seen_at column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Create index for efficient queries on last_seen_at
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at);

-- Add full_name computed column for backwards compatibility
-- (message-actions references full_name directly)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name text
GENERATED ALWAYS AS (
  COALESCE(
    NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''),
    display_name,
    email
  )
) STORED;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.last_seen_at IS 'Timestamp of user last activity, used for email notification throttling';
COMMENT ON COLUMN public.profiles.full_name IS 'Computed full name from first_name + last_name for display purposes';
