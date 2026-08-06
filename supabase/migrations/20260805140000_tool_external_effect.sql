-- ============================================================================
-- Tool external_effect flag (Pricing §1 Rule 2 — the billable boundary)
-- ============================================================================
--
-- A play is billable only if it performed at least one action that left Salt:
-- an email sent, a calendar event created, a message posted, an invoice
-- drafted into a third-party system. Memory mutations, entity linking, and
-- Keeper maintenance are LEARN-layer work and are never billed.
--
-- Making this a tool-contract property rather than a per-play judgement gives
-- metering exactly one classification point. Billability is then derived:
-- a play is billable if any tool it executed carries the flag.
--
-- NULL means "not explicitly classified" — the resolver falls back to the
-- heuristic in app/_lib/composio/external-effect.ts, which treats every
-- non-read Composio tool as external. Composio tools act on third-party
-- systems by definition, so that default is correct far more often than not,
-- and it fails toward not-billing only for reads.
-- ============================================================================

ALTER TABLE public.tool_classifications
  ADD COLUMN IF NOT EXISTS external_effect BOOLEAN;

COMMENT ON COLUMN public.tool_classifications.external_effect IS
  'Pricing §1 Rule 2: true when executing this tool produces an effect outside Salt, making any play that runs it billable. NULL defers to the heuristic in app/_lib/composio/external-effect.ts.';

-- Read tools never leave Salt with an effect — they only pull context in.
UPDATE public.tool_classifications
SET external_effect = false
WHERE risk = 'read'
  AND external_effect IS NULL;

-- Mutating and destructive Composio tools act on third-party systems.
UPDATE public.tool_classifications
SET external_effect = true
WHERE risk IN ('mutating', 'destructive')
  AND external_effect IS NULL;
