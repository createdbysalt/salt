-- Approve classifications for the curated capability-registry tools.
--
-- Every tool_slug in tool_capabilities is a tool Salt's capability resolver
-- may select for execution. The execution gate (getApprovedToolClassification)
-- falls back to slug heuristics when no approved row exists, so these tools
-- already run — but approved-only surfaces (the playbook toolkit browser,
-- search_connector_tools) see nothing. Approve the curated set explicitly so
-- the authoring surfaces reflect what playbooks actually use.
--
-- Destructive-risk rows are never auto-approved.

UPDATE public.tool_classifications AS tc
SET status = 'approved',
    approved_at = now(),
    notes = concat_ws(' ', tc.notes, '(approved 2026-08-29: curated capability-registry tool)')
FROM (SELECT DISTINCT tool_slug FROM public.tool_capabilities) AS caps
WHERE tc.tool_slug = caps.tool_slug
  AND tc.status = 'disabled'
  AND tc.risk <> 'destructive';

-- CAL_LIST_BOOKINGS is referenced by tool_capabilities but never got a
-- classification row. Read-only calendar listing.
INSERT INTO public.tool_classifications (tool_slug, risk, requires_human_confirmation, status, source, approved_at, notes)
VALUES ('CAL_LIST_BOOKINGS', 'read', false, 'approved', 'seed', now(), 'Cal.com bookings list; referenced by tool_capabilities (approved 2026-08-29)')
ON CONFLICT (tool_slug) DO UPDATE
SET status = 'approved', approved_at = now();
