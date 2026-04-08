-- ============================================================================
-- ADD TYPE COLUMN TO PROJECT TAGS (Work Tags: Project vs Retainer)
-- Allows distinguishing between project-type and retainer-type work tags
-- ============================================================================

-- Add type column with default 'project' for existing tags
ALTER TABLE studio_project_tags
ADD COLUMN type text NOT NULL DEFAULT 'project'
CHECK (type IN ('project', 'retainer'));

-- Drop the old unique constraint and create a new one that includes type
-- This allows same tag name for different types (e.g., "Website" for both projects and retainers)
ALTER TABLE studio_project_tags
DROP CONSTRAINT studio_project_tags_studio_id_name_key;

ALTER TABLE studio_project_tags
ADD CONSTRAINT studio_project_tags_studio_id_name_type_key
UNIQUE (studio_id, name, type);

-- Add index for filtering by type
CREATE INDEX studio_project_tags_type_idx ON studio_project_tags(studio_id, type);

-- Update seed function to include retainer tags
CREATE OR REPLACE FUNCTION seed_client_and_project_tags(p_studio_id uuid)
RETURNS void AS $$
BEGIN
  -- Client tags (WHO the client is)
  INSERT INTO studio_client_tags (studio_id, name)
  VALUES
    (p_studio_id, 'Startup'),
    (p_studio_id, 'Enterprise'),
    (p_studio_id, 'Agency'),
    (p_studio_id, 'SaaS'),
    (p_studio_id, 'Nonprofit')
  ON CONFLICT (studio_id, name) DO NOTHING;

  -- Project tags (WHAT the one-time work is)
  INSERT INTO studio_project_tags (studio_id, name, type)
  VALUES
    (p_studio_id, 'Website', 'project'),
    (p_studio_id, 'Branding', 'project'),
    (p_studio_id, 'App', 'project'),
    (p_studio_id, 'Marketing', 'project'),
    (p_studio_id, 'E-commerce', 'project')
  ON CONFLICT (studio_id, name, type) DO NOTHING;

  -- Retainer tags (WHAT the ongoing work is)
  INSERT INTO studio_project_tags (studio_id, name, type)
  VALUES
    (p_studio_id, 'Maintenance', 'retainer'),
    (p_studio_id, 'Support', 'retainer'),
    (p_studio_id, 'Design', 'retainer'),
    (p_studio_id, 'Development', 'retainer'),
    (p_studio_id, 'Marketing', 'retainer')
  ON CONFLICT (studio_id, name, type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Seed retainer tags for existing studios
DO $$
DECLARE
  studio_record RECORD;
BEGIN
  FOR studio_record IN SELECT id FROM studios LOOP
    -- Only insert retainer tags (project tags already exist)
    INSERT INTO studio_project_tags (studio_id, name, type)
    VALUES
      (studio_record.id, 'Maintenance', 'retainer'),
      (studio_record.id, 'Support', 'retainer'),
      (studio_record.id, 'Design', 'retainer'),
      (studio_record.id, 'Development', 'retainer'),
      (studio_record.id, 'Marketing', 'retainer')
    ON CONFLICT (studio_id, name, type) DO NOTHING;
  END LOOP;
END $$;

-- Add comment
COMMENT ON COLUMN studio_project_tags.type IS 'Work tag type: project (one-time work) or retainer (ongoing work)';
