-- Flag findings for follow-up (star / pin in Plays queue)
ALTER TABLE public.intelligence_findings
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS intelligence_findings_flagged_idx
  ON public.intelligence_findings (workspace_id, flagged_at DESC NULLS LAST)
  WHERE flagged_at IS NOT NULL;

COMMENT ON COLUMN public.intelligence_findings.flagged_at IS 'When the user flagged this finding for follow-up';
COMMENT ON COLUMN public.intelligence_findings.flagged_by IS 'User who flagged the finding';
