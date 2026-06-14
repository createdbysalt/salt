-- ============================================================================
-- Extend system_play_target enum with new entity types
-- ============================================================================
-- This must run in a separate transaction before the new system plays
-- can use these values (PostgreSQL enum behavior).

ALTER TYPE public.system_play_target ADD VALUE IF NOT EXISTS 'meeting';
ALTER TYPE public.system_play_target ADD VALUE IF NOT EXISTS 'invoice';
ALTER TYPE public.system_play_target ADD VALUE IF NOT EXISTS 'payment';
