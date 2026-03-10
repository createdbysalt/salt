-- Add archive and soft delete columns to studio_services
ALTER TABLE studio_services
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add indexes for filtering
CREATE INDEX idx_studio_services_archived_at ON studio_services(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_studio_services_deleted_at ON studio_services(deleted_at) WHERE deleted_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN studio_services.archived_at IS 'Timestamp when the service was archived. NULL means not archived.';
COMMENT ON COLUMN studio_services.deleted_at IS 'Timestamp when the service was soft-deleted. NULL means not deleted. Services are permanently deleted after 30 days.';
