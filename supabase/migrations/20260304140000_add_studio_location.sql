-- Add location field to studios table
ALTER TABLE studios ADD COLUMN IF NOT EXISTS location text;

-- Add comment for documentation
COMMENT ON COLUMN studios.location IS 'Studio location, e.g., Portland, OR';
