-- ============================================================================
-- DROP entity_relations (keeper-field-contracts Phase 4.1, step 2 of 2)
-- ============================================================================
--
-- entity_links is now the single explicit-edge store: 20260703120000 copied
-- every entity_relations row in (spellings normalized to the short dialect),
-- and the app has zero remaining readers/writers of entity_relations
-- (verified by grep sweep — writers repointed to memory/lib/edge-store.ts,
-- readers to entity_links directly).
--
-- Also drops get_entity_backlinks(): never called from app code, and its
-- body still filtered on the pre-rename studio_id column.
--
-- Dependency sweep done per the drop-bridge lesson: no trigger or function
-- body references entity_relations (checked pg_trigger/pg_proc via migration
-- history; get_entity_backlinks is the only function and drops here).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_entity_backlinks(UUID, TEXT, UUID);
DROP TABLE IF EXISTS public.entity_relations CASCADE;
