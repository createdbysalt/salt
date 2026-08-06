-- Migration: Add enabled_for_capture flag to connector_trigger_types
-- Purpose: Move trigger configuration from code (unified-connector-registry.ts)
--          to database for scalability. See docs/plans/2026-07-13-scalable-connectors.md

-- Add the column (defaults to false so new synced triggers don't auto-enable)
ALTER TABLE public.connector_trigger_types
ADD COLUMN IF NOT EXISTS enabled_for_capture boolean NOT NULL DEFAULT false;

-- Seed with currently-configured triggers from unified-connector-registry.ts
-- These are the triggers that Salt has capture adapters for and wants to subscribe to.
UPDATE public.connector_trigger_types
SET enabled_for_capture = true
WHERE trigger_slug IN (
  -- Gmail
  'GMAIL_NEW_GMAIL_MESSAGE',

  -- Outlook
  'OUTLOOK_MESSAGE_TRIGGER',
  'OUTLOOK_SENT_MESSAGE_TRIGGER',

  -- Google Calendar
  'GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER',

  -- Google Drive
  'GOOGLEDRIVE_FILE_CREATED_TRIGGER',

  -- Google Docs
  'GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER',
  'GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER',

  -- Google Sheets
  'GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER',

  -- Google Slides
  'GOOGLESLIDES_SLIDE_ADDED_TRIGGER',

  -- Notion
  'NOTION_PAGE_CREATED',
  'NOTION_PAGE_CONTENT_UPDATED',

  -- Stripe
  'STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER',
  'STRIPE_CHECKOUT_SESSION_COMPLETED_TRIGGER',
  'STRIPE_SUBSCRIPTION_ADDED_TRIGGER',
  'STRIPE_SUBSCRIPTION_DELETED_TRIGGER',
  'STRIPE_CHARGE_FAILED_TRIGGER',

  -- HubSpot
  'HUBSPOT_CONTACT_CREATED_TRIGGER',
  'HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER',

  -- Slack
  'SLACK_CHANNEL_MESSAGE_RECEIVED',
  'SLACK_DIRECT_MESSAGE_RECEIVED',

  -- Salesforce (configured in registry but phase='coming_soon')
  'SALESFORCE_ACCOUNT_CREATED_OR_UPDATED_TRIGGER',
  'SALESFORCE_CONTACT_UPDATED_TRIGGER',
  'SALESFORCE_LEAD_CREATED_OR_UPDATED_TRIGGER',
  'SALESFORCE_OPPORTUNITY_UPDATED_TRIGGER'
);

-- Add index for efficient lookup when creating trigger subscriptions
CREATE INDEX IF NOT EXISTS idx_connector_trigger_types_enabled_capture
  ON public.connector_trigger_types (toolkit_slug)
  WHERE enabled_for_capture = true;

COMMENT ON COLUMN public.connector_trigger_types.enabled_for_capture IS
  'When true, Salt subscribes to this trigger for capture. Replaces hardcoded triggerSlugs in unified-connector-registry.ts';
