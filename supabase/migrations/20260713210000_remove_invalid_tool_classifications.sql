-- Remove tool classifications for slugs that Composio rejected (2026-07-13)
-- These were seeded but are not valid Composio action names.

-- STRIPE_RETRIEVE_SUBSCRIPTION: Composio API returns "Invalid preload tool slugs"
DELETE FROM public.tool_classifications WHERE tool_slug = 'STRIPE_RETRIEVE_SUBSCRIPTION';

-- CAL_* tools: Composio API returns "Invalid preload tool slugs: CAL_LIST_BOOKINGS"
-- These may need re-verification against Composio's actual Cal.com action names.
DELETE FROM public.tool_classifications WHERE tool_slug LIKE 'CAL_%';
