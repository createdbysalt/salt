-- ============================================================================
-- Security remediation batch (2026-06-10)
-- Revokes unsafe RPC grants, tightens RLS/storage, fixes SECURITY DEFINER view
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) waitlist_leads_sheet — SECURITY INVOKER (not definer)
-- ============================================================================
DROP VIEW IF EXISTS public.waitlist_leads_sheet;

CREATE VIEW public.waitlist_leads_sheet
WITH (security_invoker = true)
AS
SELECT
  wl.id,
  wl.email,
  wl.source,
  wl.metadata->>'status' AS status,
  NULLIF(wl.metadata->>'completed_at', '')::timestamptz AS completed_at,
  wl.metadata->>'last_step' AS last_step,
  CASE wl.metadata->'qualification'->>'primaryBusiness'
    WHEN 'creative-services' THEN 'Creative services'
    WHEN 'coaching' THEN 'Coaching'
    WHEN 'real-estate' THEN 'Real estate'
    WHEN 'consulting' THEN 'Consulting'
    WHEN 'financial-advisor' THEN 'Financial advisor'
    WHEN 'wellness-therapy' THEN 'Wellness / therapy'
    WHEN 'wedding-industry' THEN 'Wedding industry'
    WHEN 'other' THEN 'Other'
    ELSE wl.metadata->'qualification'->>'primaryBusiness'
  END AS primary_business,
  CASE wl.metadata->'qualification'->>'annualRevenue'
    WHEN '50k-100k' THEN '$50K–$100K'
    WHEN '100k-200k' THEN '$100K–$200K'
    WHEN '200k-plus' THEN '$200K+'
    WHEN 'below-50k' THEN 'Below $50K'
    WHEN 'prefer-not-to-say' THEN 'Prefer not to say'
    ELSE wl.metadata->'qualification'->>'annualRevenue'
  END AS annual_revenue,
  CASE wl.metadata->'qualification'->>'operationalBottleneck'
    WHEN 'follow-ups-slip' THEN 'Follow-ups slip'
    WHEN 'invoicing-slow' THEN 'Invoicing takes forever'
    WHEN 'growth-unclear' THEN 'Don''t know what growth is worth'
    WHEN 'crm-empty' THEN 'CRM stays empty'
    WHEN 'context-lost' THEN 'Context gets lost'
    WHEN 'other' THEN 'Other'
    ELSE wl.metadata->'qualification'->>'operationalBottleneck'
  END AS operational_bottleneck,
  wl.metadata->'qualification'->>'tools' AS tools,
  CASE wl.metadata->'qualification'->>'hearAbout'
    WHEN 'word-of-mouth' THEN 'Friend or colleague'
    WHEN 'social' THEN 'Social media'
    WHEN 'search' THEN 'Search engine'
    WHEN 'podcast-video' THEN 'Podcast or video'
    WHEN 'other' THEN 'Other'
    ELSE wl.metadata->'qualification'->>'hearAbout'
  END AS hear_about,
  wl.created_at,
  wl.updated_at
FROM public.waitlist_leads AS wl;

COMMENT ON VIEW public.waitlist_leads_sheet IS
  'Spreadsheet-friendly waitlist export (SECURITY INVOKER). Service-role access only.';

REVOKE ALL ON public.waitlist_leads_sheet FROM PUBLIC;
REVOKE ALL ON public.waitlist_leads_sheet FROM anon;
REVOKE ALL ON public.waitlist_leads_sheet FROM authenticated;
GRANT SELECT ON public.waitlist_leads_sheet TO service_role;

-- ============================================================================
-- 2) Lock down SECURITY DEFINER RPCs (credits + agent audit)
-- ============================================================================
REVOKE ALL ON FUNCTION public.add_purchased_credits(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_purchased_credits(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.add_purchased_credits(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.add_purchased_credits(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.deduct_ai_credits(uuid, integer, text, numeric, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_ai_credits(uuid, integer, text, numeric, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.deduct_ai_credits(uuid, integer, text, numeric, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_ai_credits(uuid, integer, text, numeric, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.reset_monthly_ai_credits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_monthly_ai_credits() FROM anon;
REVOKE ALL ON FUNCTION public.reset_monthly_ai_credits() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reset_monthly_ai_credits() TO service_role;

REVOKE ALL ON FUNCTION public.log_agent_operation(
  text, text, integer, text[], text, text, text, text, text, text, integer
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_agent_operation(
  text, text, integer, text[], text, text, text, text, text, text, integer
) FROM anon;
REVOKE ALL ON FUNCTION public.log_agent_operation(
  text, text, integer, text[], text, text, text, text, text, text, integer
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_agent_operation(
  text, text, integer, text[], text, text, text, text, text, text, integer
) TO service_role;

-- Trigger-only auth hook — not callable via PostgREST RPC
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- Membership helpers: authenticated only (used by RLS), not anon
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_studio_member(uuid) FROM anon;

ALTER FUNCTION public.add_purchased_credits(uuid, integer)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.deduct_ai_credits(uuid, integer, text, numeric, jsonb)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.reset_monthly_ai_credits()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.log_agent_operation(
  text, text, integer, text[], text, text, text, text, text, text, integer
) SET search_path = pg_catalog, public;

-- ============================================================================
-- 3) Tighten permissive RLS policies
-- ============================================================================

-- Public intake submissions: require minimal fields (optional table)
DO $$
BEGIN
  IF to_regclass('public.client_intakes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "public_submit_intakes" ON public.client_intakes;
    CREATE POLICY "public_submit_intakes" ON public.client_intakes
      FOR INSERT TO anon, authenticated
      WITH CHECK (
        studio_id IS NOT NULL
        AND website_url IS NOT NULL
        AND length(trim(website_url)) > 0
        AND primary_goal IS NOT NULL
        AND length(trim(primary_goal)) >= 10
        AND status = 'submitted'
      );
  END IF;
END $$;

-- Gmail sync logs: service role writes only (optional)
DO $$
BEGIN
  IF to_regclass('public.gmail_sync_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Service role can insert sync logs" ON public.gmail_sync_logs;
    CREATE POLICY "service_role_insert_sync_logs" ON public.gmail_sync_logs
      FOR INSERT TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Marketing pipeline tables: service role only (optional — not all environments)
DO $$
BEGIN
  IF to_regclass('public.pipeline_runs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow insert from anon" ON public.pipeline_runs;
    DROP POLICY IF EXISTS "Allow select from anon" ON public.pipeline_runs;
    ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_role_manage_pipeline_runs" ON public.pipeline_runs;
    CREATE POLICY "service_role_manage_pipeline_runs" ON public.pipeline_runs
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF to_regclass('public.youtube_video_stats') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow insert from anon" ON public.youtube_video_stats;
    DROP POLICY IF EXISTS "Allow select from anon" ON public.youtube_video_stats;
    DROP POLICY IF EXISTS "Allow update from anon" ON public.youtube_video_stats;
    ALTER TABLE public.youtube_video_stats ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_role_manage_youtube_video_stats" ON public.youtube_video_stats;
    CREATE POLICY "service_role_manage_youtube_video_stats" ON public.youtube_video_stats
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Materialized view: internal analytics only (optional)
DO $$
BEGIN
  IF to_regclass('public.client_engagement_stats') IS NOT NULL THEN
    REVOKE ALL ON public.client_engagement_stats FROM PUBLIC;
    REVOKE ALL ON public.client_engagement_stats FROM anon;
    REVOKE ALL ON public.client_engagement_stats FROM authenticated;
    GRANT SELECT ON public.client_engagement_stats TO service_role;
  END IF;
END $$;

-- ============================================================================
-- 4) Storage — prevent public bucket listing while keeping direct reads
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = 'avatars'
  );

DROP POLICY IF EXISTS "public_read_branding_assets" ON storage.objects;
CREATE POLICY "public_read_branding_assets"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'bridge-branding'
    AND (storage.foldername(name))[1] IS NOT NULL
  );

COMMIT;
