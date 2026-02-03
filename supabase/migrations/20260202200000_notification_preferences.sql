-- Migration: Create notification_preferences table
-- Story: S1-003 - Create notification preferences table
-- Description: Allows users to configure notification batching and quiet hours

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Batching preference (immediate, hourly, or daily digest)
  batching text NOT NULL DEFAULT 'immediate'
    CHECK (batching IN ('immediate', 'hourly', 'daily')),

  -- Quiet hours configuration
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_hours_timezone text NOT NULL DEFAULT 'UTC',
  quiet_hours_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}',  -- Mon-Fri (1=Monday, 7=Sunday)

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Each user can only have one preferences record
  CONSTRAINT notification_preferences_user_id_unique UNIQUE (user_id)
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own preferences
CREATE POLICY "users_view_own_notification_preferences" ON notification_preferences
FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Users can insert their own preferences
CREATE POLICY "users_insert_own_notification_preferences" ON notification_preferences
FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can update their own preferences
CREATE POLICY "users_update_own_notification_preferences" ON notification_preferences
FOR UPDATE USING (user_id = auth.uid());

-- RLS Policy: Users can delete their own preferences
CREATE POLICY "users_delete_own_notification_preferences" ON notification_preferences
FOR DELETE USING (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE notification_preferences IS
  'User notification preferences including batching settings and quiet hours configuration';

COMMENT ON COLUMN notification_preferences.batching IS
  'How notifications are delivered: immediate, hourly digest, or daily digest';

COMMENT ON COLUMN notification_preferences.quiet_hours_days IS
  'Days of week when quiet hours apply (1=Monday, 7=Sunday). Default is Monday-Friday.';
