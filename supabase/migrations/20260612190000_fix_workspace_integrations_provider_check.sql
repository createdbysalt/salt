-- Fix the provider allowlist on workspace_integrations.
--
-- Root cause: the table was renamed studio_integrations → workspace_integrations,
-- but Postgres keeps constraint names on rename. The live constraint is still
-- named studio_integrations_provider_check, so the 20260612000000 migration
-- (which dropped workspace_integrations_provider_check) never replaced it —
-- every connect for a provider outside the original list failed with 23514
-- AFTER Composio had already stored the connection.
--
-- This migration drops BOTH names and recreates one constraint covering the
-- full connector catalog. Keep this list in sync with
-- COMPOSIO_WORKSPACE_PROVIDERS in app/_lib/composio/providers.ts
-- ('calcom' is a legacy row value kept for existing data).

ALTER TABLE public.workspace_integrations
  DROP CONSTRAINT IF EXISTS studio_integrations_provider_check;

ALTER TABLE public.workspace_integrations
  DROP CONSTRAINT IF EXISTS workspace_integrations_provider_check;

ALTER TABLE public.workspace_integrations
  ADD CONSTRAINT workspace_integrations_provider_check
  CHECK (provider IN (
    'airtable',
    'apollo',
    'asana',
    'basecamp',
    'brandfetch',
    'cal',
    'calcom',
    'calendly',
    'canva',
    'clickup',
    'composio',
    'convertkit',
    'cursor',
    'discord',
    'dockerhub',
    'docusign',
    'dropbox',
    'dropboxsign',
    'elevenlabs',
    'facebook',
    'facebookads',
    'figma',
    'firecrawl',
    'fireflies',
    'followupboss',
    'github',
    'gitlab',
    'gmail',
    'googleads',
    'googleanalytics',
    'googlecalendar',
    'googledocs',
    'googledrive',
    'googlemaps',
    'googlesearchconsole',
    'googlesheets',
    'googleslides',
    'googletagmanager',
    'granola',
    'heygen',
    'hubspot',
    'instacart',
    'instagram',
    'jira',
    'jotform',
    'lemonsqueezy',
    'linear',
    'linkedin',
    'linkedinads',
    'mailchimp',
    'matterport',
    'mercury',
    'microsoftexcel',
    'microsoftpowerpoint',
    'microsoftword',
    'miro',
    'monday',
    'notion',
    'onedrive',
    'onepassword',
    'openrouter',
    'outlook',
    'pagespeed',
    'pandadoc',
    'pipedrive',
    'pipelinecrm',
    'posthog',
    'quickbooks',
    'ramp',
    'reddit',
    'redditads',
    'resend',
    'salesforce',
    'sanity',
    'semrush',
    'shopify',
    'slack',
    'square',
    'stripe',
    'supabase',
    'tally',
    'telegram',
    'tiktok',
    'trello',
    'twitter',
    'typeform',
    'vercel',
    'webflow',
    'whatsapp',
    'wix',
    'wrike',
    'youtube',
    'zoom'
  ));
