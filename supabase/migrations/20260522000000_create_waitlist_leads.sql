-- ============================================================================
-- WAITLIST LEADS
-- Operational lead capture for the public marketing homepage.
-- Inserts are performed server-side with the service role key.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.waitlist_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  normalized_email text NOT NULL,
  source text NOT NULL DEFAULT 'homepage',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT waitlist_leads_email_not_blank CHECK (length(trim(email)) > 0),
  CONSTRAINT waitlist_leads_normalized_email_not_blank CHECK (length(trim(normalized_email)) > 0),
  CONSTRAINT waitlist_leads_source_not_blank CHECK (length(trim(source)) > 0),
  CONSTRAINT waitlist_leads_normalized_email_unique UNIQUE (normalized_email)
);

CREATE INDEX IF NOT EXISTS waitlist_leads_created_at_idx
  ON public.waitlist_leads (created_at DESC);

ALTER TABLE public.waitlist_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_waitlist_leads"
  ON public.waitlist_leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.waitlist_leads TO service_role;

CREATE OR REPLACE FUNCTION public.update_waitlist_leads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER waitlist_leads_updated_at
  BEFORE UPDATE ON public.waitlist_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_waitlist_leads_updated_at();
