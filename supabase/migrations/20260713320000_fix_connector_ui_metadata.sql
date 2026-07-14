-- Migration: Fix UI metadata for curated connectors
-- The previous migration (20260713300000) used incorrect jsonb_set syntax
-- This migration uses proper JSONB merge with || operator

-- Gmail
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "google",
  "tagline": "Search, read, and send email — sends only after you approve.",
  "developedBy": "Google",
  "phase": "released",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://www.google.com/gmail/about/"},
    {"label": "Documentation", "href": "https://developers.google.com/workspace/gmail/api/guides"},
    {"label": "Support", "href": "https://support.google.com/mail"}
  ]
}'::jsonb
WHERE provider_key = 'gmail';

-- Outlook
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "outlook",
  "tagline": "Email and calendar from Microsoft 365.",
  "developedBy": "Microsoft",
  "phase": "beta",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://outlook.com"},
    {"label": "Documentation", "href": "https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview"},
    {"label": "Support", "href": "https://support.microsoft.com/en-us/outlook"}
  ]
}'::jsonb
WHERE provider_key = 'outlook';

-- Google Calendar
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "google-calendar",
  "tagline": "Events and availability — Salt schedules only with your approval.",
  "developedBy": "Google",
  "phase": "released",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://calendar.google.com"},
    {"label": "Documentation", "href": "https://developers.google.com/workspace/calendar/api/guides/overview"},
    {"label": "Support", "href": "https://support.google.com/calendar"}
  ]
}'::jsonb
WHERE provider_key = 'googlecalendar';

-- Cal.com
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "calcom",
  "tagline": "Booking links and scheduled meetings.",
  "developedBy": "Cal.com",
  "phase": "beta",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://cal.com"},
    {"label": "Documentation", "href": "https://cal.com/docs"},
    {"label": "Support", "href": "https://cal.com/support"}
  ]
}'::jsonb
WHERE provider_key = 'cal';

-- Calendly
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "calendly",
  "tagline": "Scheduling and meeting bookings.",
  "developedBy": "Calendly",
  "phase": "beta",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://calendly.com"},
    {"label": "Documentation", "href": "https://developer.calendly.com"},
    {"label": "Support", "href": "https://help.calendly.com"}
  ]
}'::jsonb
WHERE provider_key = 'calendly';

-- Google Drive
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "google-drive",
  "tagline": "Files and shared documents for client work.",
  "developedBy": "Google",
  "phase": "released",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://www.google.com/drive/"},
    {"label": "Documentation", "href": "https://developers.google.com/workspace/drive/api/guides/about-sdk"},
    {"label": "Support", "href": "https://support.google.com/drive"}
  ]
}'::jsonb
WHERE provider_key = 'googledrive';

-- Dropbox
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "dropbox",
  "tagline": "Files and shared folders for client work.",
  "developedBy": "Dropbox",
  "phase": "beta",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://www.dropbox.com"},
    {"label": "Documentation", "href": "https://www.dropbox.com/developers/documentation"},
    {"label": "Support", "href": "https://help.dropbox.com"}
  ]
}'::jsonb
WHERE provider_key = 'dropbox';

-- Google Docs
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "google-docs",
  "tagline": "Documents and proposals for client work.",
  "developedBy": "Google",
  "phase": "released",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://docs.google.com"},
    {"label": "Documentation", "href": "https://developers.google.com/docs/api/how-tos/overview"},
    {"label": "Support", "href": "https://support.google.com/docs"}
  ]
}'::jsonb
WHERE provider_key = 'googledocs';

-- Google Sheets
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "google-sheets",
  "tagline": "Spreadsheets and data for client projects.",
  "developedBy": "Google",
  "phase": "released",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://sheets.google.com"},
    {"label": "Documentation", "href": "https://developers.google.com/sheets/api/guides/concepts"},
    {"label": "Support", "href": "https://support.google.com/docs"}
  ]
}'::jsonb
WHERE provider_key = 'googlesheets';

-- Google Slides
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "google-slides",
  "tagline": "Presentations for client work.",
  "developedBy": "Google",
  "phase": "released",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://slides.google.com"},
    {"label": "Documentation", "href": "https://developers.google.com/slides/api/guides/overview"},
    {"label": "Support", "href": "https://support.google.com/docs"}
  ]
}'::jsonb
WHERE provider_key = 'googleslides';

-- Notion
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "notion",
  "tagline": "Pages and databases for client knowledge.",
  "developedBy": "Notion",
  "phase": "beta",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://www.notion.so"},
    {"label": "Documentation", "href": "https://developers.notion.com"},
    {"label": "Support", "href": "https://www.notion.so/help"}
  ]
}'::jsonb
WHERE provider_key = 'notion';

-- Stripe
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "stripe",
  "tagline": "Revenue, invoices, and subscriptions — Salt acts only with your approval.",
  "developedBy": "Stripe",
  "phase": "released",
  "showInCatalog": true,
  "connectHelp": "Create a **restricted key** in [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys). Grant read access to Customers, Invoices, Subscriptions, and Charges.",
  "links": [
    {"label": "Website", "href": "https://stripe.com"},
    {"label": "Documentation", "href": "https://docs.stripe.com/keys"},
    {"label": "Support", "href": "https://support.stripe.com"}
  ]
}'::jsonb
WHERE provider_key = 'stripe';

-- QuickBooks
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "quickbooks",
  "tagline": "Invoices and accounting data.",
  "developedBy": "Intuit",
  "phase": "beta",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://quickbooks.intuit.com"},
    {"label": "Documentation", "href": "https://developer.intuit.com/app/developer/qbo/docs/get-started"},
    {"label": "Support", "href": "https://quickbooks.intuit.com/learn-support"}
  ]
}'::jsonb
WHERE provider_key = 'quickbooks';

-- HubSpot
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "hubspot",
  "tagline": "Contacts and deals — update with your approval.",
  "developedBy": "HubSpot",
  "phase": "beta",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://www.hubspot.com"},
    {"label": "Documentation", "href": "https://developers.hubspot.com/docs/api/overview"},
    {"label": "Support", "href": "https://help.hubspot.com"}
  ]
}'::jsonb
WHERE provider_key = 'hubspot';

-- Slack
UPDATE public.connector_catalog
SET meta = COALESCE(meta, '{}'::jsonb) || '{
  "catalogId": "slack",
  "tagline": "Channels and messages — send with your approval.",
  "developedBy": "Slack",
  "phase": "beta",
  "showInCatalog": true,
  "links": [
    {"label": "Website", "href": "https://slack.com"},
    {"label": "Documentation", "href": "https://api.slack.com/docs"},
    {"label": "Support", "href": "https://slack.com/help"}
  ]
}'::jsonb
WHERE provider_key = 'slack';
