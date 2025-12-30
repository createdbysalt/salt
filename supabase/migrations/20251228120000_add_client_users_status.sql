-- Add status column to client_users table
-- Tracks invite lifecycle: pending → active

-- Add status enum type
DO $$ BEGIN
  CREATE TYPE client_user_status AS ENUM ('pending', 'active');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column (default to 'active' for existing users)
ALTER TABLE public.client_users 
ADD COLUMN IF NOT EXISTS status client_user_status NOT NULL DEFAULT 'active';

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_client_users_status ON public.client_users(status);

-- Add updated_at trigger to track status changes
CREATE OR REPLACE FUNCTION update_client_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_users_updated_at ON public.client_users;
CREATE TRIGGER client_users_updated_at
  BEFORE UPDATE ON public.client_users
  FOR EACH ROW
  EXECUTE FUNCTION update_client_user_updated_at();

-- Comment for documentation
COMMENT ON COLUMN public.client_users.status IS 'Invite status: pending (invited but not accepted) or active (accepted and can access bridge)';

