-- ============================================================================
-- DROP PROBLEMATIC RLS POLICY
-- ============================================================================
-- The policy added in 20260110000001 causes infinite recursion
-- because of the complex RLS chain: studios -> client_users -> clients -> studio_members -> studios

DROP POLICY IF EXISTS "Client users can view studios for their clients" ON public.studios;
