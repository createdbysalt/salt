-- ============================================================================
-- Add Retainer-Specific Fields to Studio Services
-- ============================================================================
-- Extends studio_services to support retainer packages with hours, response
-- times, rollover, and included services. Used when pricing_type = 'retainer'.
-- ============================================================================

-- Add retainer-specific columns
ALTER TABLE studio_services
ADD COLUMN IF NOT EXISTS hours_included numeric,
ADD COLUMN IF NOT EXISTS response_time text,
ADD COLUMN IF NOT EXISTS rollover_hours numeric,
ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS is_recommended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS services_included jsonb DEFAULT '[]'::jsonb;

-- Add constraints
ALTER TABLE studio_services
ADD CONSTRAINT valid_hours_included CHECK (hours_included IS NULL OR hours_included >= 0),
ADD CONSTRAINT valid_rollover_hours CHECK (rollover_hours IS NULL OR rollover_hours >= 0),
ADD CONSTRAINT valid_billing_interval CHECK (billing_interval IN ('monthly', 'quarterly', 'annually'));

-- Index for filtering retainer services
CREATE INDEX IF NOT EXISTS studio_services_pricing_type_idx
ON studio_services(studio_id, pricing_type)
WHERE pricing_type = 'retainer';

-- Comments
COMMENT ON COLUMN studio_services.hours_included IS 'Monthly hours included in retainer (null for non-retainer services)';
COMMENT ON COLUMN studio_services.response_time IS 'Response time SLA, e.g., "48 business hours", "Same day"';
COMMENT ON COLUMN studio_services.rollover_hours IS 'Max hours that can roll over to next month';
COMMENT ON COLUMN studio_services.billing_interval IS 'Billing frequency: monthly, quarterly, annually';
COMMENT ON COLUMN studio_services.is_recommended IS 'Show "Recommended" badge on this package';
COMMENT ON COLUMN studio_services.services_included IS 'JSON array of service descriptions included in package';
