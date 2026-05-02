-- Update domain verification function to use usesalt.io branding
-- Part of rebrand from saltcore.io to usesalt.io

-- Recreate the function with updated domain references
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
      'hostname', '_salt-verify.' || domain_record.hostname,
      'value', domain_record.verification_token,
      'instructions', 'Add a TXT record to your DNS with the hostname and value above.'
    );
  ELSIF domain_record.verification_method = 'cname' THEN
    RETURN jsonb_build_object(
      'method', 'CNAME',
      'hostname', domain_record.hostname,
      'value', 'verify.usesalt.io',
      'instructions', 'Add a CNAME record pointing your domain to verify.usesalt.io'
    );
  ELSE
    RETURN jsonb_build_object('error', 'Unknown verification method');
  END IF;
END;
$$;

-- Update table comment to reflect new branding
COMMENT ON TABLE public.studio_domains IS 'Custom domains for studio Bridge portals (BYOD - Bring Your Own Domain) - usesalt.io';
