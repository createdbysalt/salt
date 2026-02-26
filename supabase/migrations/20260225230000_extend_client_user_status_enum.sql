-- Extend client_user_status enum with additional values
-- Adds: 'not_invited' (contact added but not sent invite) and 'revoked' (access removed)

-- Add new enum values
ALTER TYPE client_user_status ADD VALUE IF NOT EXISTS 'not_invited';
ALTER TYPE client_user_status ADD VALUE IF NOT EXISTS 'revoked';

-- Update comment to reflect new values
COMMENT ON COLUMN public.client_users.status IS 'Invite status: not_invited (added but no invite sent), pending (invited but not accepted), active (accepted and can access bridge), revoked (access removed)';
