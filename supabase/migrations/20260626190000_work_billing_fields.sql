-- Add billing fields to work table

-- Payment type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_payment_type') THEN
    CREATE TYPE public.projects_payment_type AS ENUM (
      'fixed',
      'retainer',
      'hourly',
      'milestone'
    );
  END IF;
END $$;

-- Add billing columns to work table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS contract_value_cents INTEGER,
  ADD COLUMN IF NOT EXISTS payment_type public.projects_payment_type,
  ADD COLUMN IF NOT EXISTS hourly_rate_cents INTEGER,
  ADD COLUMN IF NOT EXISTS hours_estimate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hours_logged NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retainer_mrr_cents INTEGER,
  ADD COLUMN IF NOT EXISTS renewal_date DATE,
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS decision_date DATE,
  ADD COLUMN IF NOT EXISTS win_probability INTEGER CHECK (win_probability >= 0 AND win_probability <= 100);

-- Comments for documentation
COMMENT ON COLUMN public.projects.contract_value_cents IS 'Total contract/project value in cents';
COMMENT ON COLUMN public.projects.payment_type IS 'How this work is billed: fixed, retainer, hourly, milestone';
COMMENT ON COLUMN public.projects.hourly_rate_cents IS 'Hourly rate for hourly work in cents';
COMMENT ON COLUMN public.projects.hours_estimate IS 'Estimated hours for hourly/project work';
COMMENT ON COLUMN public.projects.hours_logged IS 'Actual hours logged';
COMMENT ON COLUMN public.projects.retainer_mrr_cents IS 'Monthly recurring revenue for retainer work in cents';
COMMENT ON COLUMN public.projects.renewal_date IS 'Next renewal date for retainer work';
COMMENT ON COLUMN public.projects.event_date IS 'Event date for event-type work';
COMMENT ON COLUMN public.projects.decision_date IS 'Expected decision date for proposal-type work';
COMMENT ON COLUMN public.projects.win_probability IS 'Probability of winning (0-100) for proposal-type work';
