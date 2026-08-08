-- Migrate capture_routing_decisions → capture_record_links (Phase 1.16c)
--
-- capture_routing_decisions was the June-era routing queue: one decision per
-- surface per capture, with review/correction tracking for a UI that no
-- longer exists (deleted in 1.1/1.3). What survives is only the LINK data —
-- "this capture is linked to this Memory record" — used by manual
-- link/unlink, the enrichment record-matcher, and the meetings executor.
--
-- The new table is links-only: no status lifecycle, no review columns, and a
-- proper workspace_id (the old table had none — tenancy was inferred through
-- the capture FK). Tier decisions (create/watch/nothing) live in
-- record_capture_decisions, which is untouched.
--
-- record_capture_correction (SECURITY DEFINER RPC) only wrote corrections to
-- the old table and has zero call sites — dropped with it.

CREATE TABLE public.capture_record_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  capture_event_id UUID NOT NULL REFERENCES public.capture_events(id) ON DELETE CASCADE,

  target_surface public.memory_surface NOT NULL,
  target_entity_id UUID NOT NULL,

  confidence INTEGER NOT NULL DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
  -- manual = user linked it; auto = routing engine; system = internal executor
  link_source TEXT NOT NULL DEFAULT 'manual' CHECK (link_source IN ('manual', 'auto', 'system')),
  reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- A capture can link to many records, but not the same record twice
  CONSTRAINT capture_record_links_unique UNIQUE (capture_event_id, target_surface, target_entity_id)
);

CREATE INDEX idx_capture_record_links_capture ON public.capture_record_links(capture_event_id);
CREATE INDEX idx_capture_record_links_target ON public.capture_record_links(target_entity_id);
CREATE INDEX idx_capture_record_links_workspace ON public.capture_record_links(workspace_id);

ALTER TABLE public.capture_record_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_capture_record_links" ON public.capture_record_links
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_manage_capture_record_links" ON public.capture_record_links
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Migrate live links: rows that actually point at a record and were acted on.
-- Old uniqueness was (capture, surface); new is (capture, surface, entity), so
-- a capture with two approved rows for one surface keeps only the first.
INSERT INTO public.capture_record_links (
  workspace_id, capture_event_id, target_surface, target_entity_id,
  confidence, link_source, reason, created_at
)
SELECT
  ce.workspace_id,
  crd.capture_event_id,
  crd.target_surface,
  crd.target_entity_id,
  crd.confidence,
  CASE WHEN crd.status = 'auto_routed' THEN 'auto' ELSE 'manual' END,
  crd.reason,
  crd.created_at
FROM public.capture_routing_decisions crd
JOIN public.capture_events ce ON ce.id = crd.capture_event_id
WHERE crd.target_entity_id IS NOT NULL
  AND crd.status IN ('approved', 'auto_routed')
ON CONFLICT ON CONSTRAINT capture_record_links_unique DO NOTHING;

DROP FUNCTION IF EXISTS public.record_capture_correction(UUID, UUID, TEXT);
DROP TABLE public.capture_routing_decisions;
