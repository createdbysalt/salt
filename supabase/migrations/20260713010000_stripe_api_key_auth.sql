-- Switch Stripe connector from OAuth to API key auth
-- The OAuth config (ac_Uk-_Q-Y3razH) doesn't support API key connections.
-- Use the API key auth config (ac_X574CtxR9zWw) instead.

-- 1. Update connector_catalog to use api_key auth method
UPDATE public.connector_catalog
SET auth_method = 'api_key'
WHERE provider_key = 'stripe';

-- 2. Update connector_overrides with:
--    - The API key auth config ID
--    - The correct api_key_field_name (Stripe uses 'api_key')
--    - The api_key_form for the connect flow
UPDATE public.connector_overrides
SET
  auth_config_id = 'ac_X574CtxR9zWw',
  auth_config_env_var = 'COMPOSIO_STRIPE_APIKEY_AUTH_CONFIG_ID',
  api_key_field_name = 'api_key',
  api_key_form = '{
    "keyLabel": "Restricted API key",
    "keyPlaceholder": "rk_live_…",
    "extraFields": []
  }'::jsonb
WHERE provider_key = 'stripe';

-- 3. Update meta with connectHelp for the inline API key flow
UPDATE public.connector_catalog
SET meta = jsonb_set(
  meta,
  '{connectHelp}',
  to_jsonb($connecthelp$1. Open [Stripe API keys](https://dashboard.stripe.com/apikeys) in a new tab.
2. Click **Create restricted key**.
3. Name it **Salt**, then turn on these permissions:

   - **Customers** — Read
   - **Invoices** — Read
   - **Subscriptions** — Read
   - **Charges** — Read
   - **Webhooks** — Write

4. Click **Create key**, then paste it in the field above.$connecthelp$::text)
)
WHERE provider_key = 'stripe';
