-- Junction table to link emails to existing files (many-to-many)
-- This allows the same file to be attached to multiple emails
-- and multiple files to be attached to the same email

CREATE TABLE IF NOT EXISTS email_file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES client_emails(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES project_files(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate attachments
  UNIQUE(email_id, file_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_email_file_attachments_email_id ON email_file_attachments(email_id);
CREATE INDEX idx_email_file_attachments_file_id ON email_file_attachments(file_id);

-- RLS policies
ALTER TABLE email_file_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for emails they can access
CREATE POLICY "Users can view email attachments"
  ON email_file_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_emails ce
      JOIN studio_members sm ON sm.studio_id = ce.studio_id
      WHERE ce.id = email_file_attachments.email_id
      AND sm.user_id = auth.uid()
    )
  );

-- Users can insert attachments for emails in their studio
CREATE POLICY "Users can insert email attachments"
  ON email_file_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_emails ce
      JOIN studio_members sm ON sm.studio_id = ce.studio_id
      WHERE ce.id = email_file_attachments.email_id
      AND sm.user_id = auth.uid()
    )
  );

-- Users can delete attachments for emails in their studio
CREATE POLICY "Users can delete email attachments"
  ON email_file_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM client_emails ce
      JOIN studio_members sm ON sm.studio_id = ce.studio_id
      WHERE ce.id = email_file_attachments.email_id
      AND sm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE email_file_attachments IS 'Links emails to files that were attached when sending. Supports attaching existing Files tab files to emails.';
