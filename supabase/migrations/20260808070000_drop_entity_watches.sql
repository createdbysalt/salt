-- Drop the entity_watches system (Phase 1.16a)
--
-- entity_watches was the July "watch then propose" signal table behind Ask
-- Salt's add_to_watching. It was broken end-to-end: the tool wrote
-- filter_criteria.entity_id while the only reader (daily-scan cron) matched on
-- person_id/org_id, and its on_match signal keys were never in the signal
-- registry, so emitEntitySignal rejected them. The Ask Salt tool now registers
-- entity_watch_expressions (existing_entity) instead — the live known-entity
-- fast-track / re-enrichment path.
--
-- increment_watch_trigger_count was only called from the deleted TS module.

DROP FUNCTION IF EXISTS public.increment_watch_trigger_count(UUID);
DROP TABLE IF EXISTS public.entity_watches;
