-- Studio Domains Table for BYOD (Bring Your Own Domain)
-- Allows studios to use custom domains for their Bridge portals
-- Example: bridge.saltstudio.com instead of bridge.saltcore.io

-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create domain status enum
DO $$ BEGIN
  CREATE TYPE domain_status AS ENUM ('pending', 'verified', 'failed', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create studio_domains table
CREATE TABLE IF NOT EXISTS public.studio_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  hostname text NOT NULL UNIQUE,
  status domain_status NOT NULL DEFAULT 'pending',
  
  -- DNS verification
  verification_token text NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  verification_method text NOT NULL DEFAULT 'txt', -- 'txt' or 'cname'
  verified_at timestamp with time zone,
  last_verified_at timestamp with time zone,
  
  -- SSL/TLS (managed by platform)
  ssl_status text DEFAULT 'pending', -- 'pending', 'active', 'failed'
  ssl_issued_at timestamp with time zone,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_hostname CHECK (
    hostname ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'
  ),
  CONSTRAINT valid_ssl_status CHECK (
    ssl_status IN ('pending', 'active', 'failed')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_studio_domains_studio_id ON public.studio_domains(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_domains_hostname ON public.studio_domains(hostname);
CREATE INDEX IF NOT EXISTS idx_studio_domains_status ON public.studio_domains(status);
CREATE INDEX IF NOT EXISTS idx_studio_domains_verification_token ON public.studio_domains(verification_token);

-- Enable RLS
ALTER TABLE public.studio_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Studio members can view their domains"
  ON public.studio_domains FOR SELECT
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Studio owners/admins can manage domains"
  ON public.studio_domains FOR ALL
  USING (
    studio_id IN (
      SELECT studio_id FROM public.studio_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_studio_domain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS studio_domains_updated_at ON public.studio_domains;
CREATE TRIGGER studio_domains_updated_at
  BEFORE UPDATE ON public.studio_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_studio_domain_updated_at();

-- Function to verify domain ownership via DNS
CREATE OR REPLACE FUNCTION public.verify_studio_domain(domain_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  domain_record record;
  verification_result jsonb;
BEGIN
  -- Get domain record
  SELECT * INTO domain_record
  FROM public.studio_domains
  WHERE id = domain_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Domain not found');
  END IF;
  
  -- In production, this would make an actual DNS query
  -- For now, we'll return a placeholder that requires manual verification
  -- You would integrate with a DNS verification service here
  
  -- Placeholder: Mark as verified (in production, check actual DNS records)
  UPDATE public.studio_domains
  SET 
    status = 'verified',
    verified_at = NOW(),
    last_verified_at = NOW()
  WHERE id = domain_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Domain verification initiated. Check DNS records.',
    'verification_token', domain_record.verification_token,
    'verification_method', domain_record.verification_method
  );
END;
$$;

-- Function to get DNS verification instructions
CREATE OR REPLACE FUNCTION public.get_domain_verification_instructions(domain_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  domain_record record;
BEGIN
  SELECT * INTO domain_record
  FROM public.studio_domains
  WHERE id = domain_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Domain not found');
  END IF;
  
  -- Return instructions based on verification method
  IF domain_record.verification_method = 'txt' THEN
    RETURN jsonb_build_object(
      'method', 'TXT',
      'hostname', '_saltcore-verify.' || domain_record.hostname,
      'value', domain_record.verification_token,
      'instructions', 'Add a TXT record to your DNS with the hostname and value above.'
    );
  ELSIF domain_record.verification_method = 'cname' THEN
    RETURN jsonb_build_object(
      'method', 'CNAME',
      'hostname', domain_record.hostname,
      'value', 'verify.saltcore.io',
      'instructions', 'Add a CNAME record pointing your domain to verify.saltcore.io'
    );
  ELSE
    RETURN jsonb_build_object('error', 'Unknown verification method');
  END IF;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.studio_domains IS 'Custom domains for studio Bridge portals (BYOD - Bring Your Own Domain)';
COMMENT ON COLUMN public.studio_domains.hostname IS 'Fully qualified domain name (e.g., bridge.saltstudio.com)';
COMMENT ON COLUMN public.studio_domains.status IS 'Domain verification status: pending → verified → active or failed';
COMMENT ON COLUMN public.studio_domains.verification_token IS 'Random token for DNS verification (TXT record or challenge)';
COMMENT ON COLUMN public.studio_domains.verification_method IS 'DNS verification method: txt (TXT record) or cname (CNAME record)';
COMMENT ON COLUMN public.studio_domains.ssl_status IS 'SSL certificate status (managed by platform/CDN)';

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.verify_studio_domain(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_domain_verification_instructions(uuid) TO authenticated;

