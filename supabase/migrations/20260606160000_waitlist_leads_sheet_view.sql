-- ============================================================================
-- WAITLIST LEADS SHEET VIEW
-- Spreadsheet-style read model for Supabase Table Editor / SQL exports.
-- Source of truth remains public.waitlist_leads (written by saveWaitlistLeadAction).
-- ============================================================================

CREATE OR REPLACE VIEW public.waitlist_leads_sheet AS
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
  'Spreadsheet-friendly waitlist export. Open in Supabase Dashboard → Table Editor → waitlist_leads_sheet. Filter status = complete for finished signups.';

GRANT SELECT ON public.waitlist_leads_sheet TO service_role;

CREATE INDEX IF NOT EXISTS waitlist_leads_metadata_status_idx
  ON public.waitlist_leads ((metadata->>'status'));
