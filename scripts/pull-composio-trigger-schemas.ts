/**
 * Pull Composio trigger payload schemas for every capture-subscribed slug.
 *
 * Ground truth for the capture normalizers: each category adapter's
 * `normalize()` must parse the shapes documented here. Output feeds the
 * golden fixtures in app/_features/capture/adapters/__fixtures__/.
 *
 * Run: op run --env-file=.env.1password -- pnpm tsx scripts/pull-composio-trigger-schemas.ts
 */

import { Composio } from "@composio/core";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Every trigger slug the category adapters subscribe to (see
// app/_features/capture/adapters/categories/*.ts). Keep in sync when a
// connector's capture triggers change.
const CAPTURE_TRIGGER_SLUGS = [
  // email
  "GMAIL_NEW_GMAIL_MESSAGE",
  "OUTLOOK_MESSAGE_TRIGGER",
  "OUTLOOK_SENT_MESSAGE_TRIGGER",
  // calendar
  "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER",
  "OUTLOOK_EVENT_TRIGGER",
  "OUTLOOK_EVENT_CHANGE_TRIGGER",
  // storage
  "GOOGLEDRIVE_FILE_CREATED_TRIGGER",
  // documents
  "NOTION_PAGE_CREATED",
  "NOTION_PAGE_CONTENT_UPDATED",
  "GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER",
  "GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER",
  "GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER",
  "GOOGLESLIDES_SLIDE_ADDED_TRIGGER",
  // billing
  "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER",
  "STRIPE_CHECKOUT_SESSION_COMPLETED_TRIGGER",
  "STRIPE_SUBSCRIPTION_ADDED_TRIGGER",
  "STRIPE_SUBSCRIPTION_DELETED_TRIGGER",
  "STRIPE_CHARGE_FAILED_TRIGGER",
  // crm
  "HUBSPOT_CONTACT_CREATED_TRIGGER",
  "HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER",
  "SALESFORCE_ACCOUNT_CREATED_OR_UPDATED_TRIGGER",
  "SALESFORCE_CONTACT_UPDATED_TRIGGER",
  "SALESFORCE_LEAD_CREATED_OR_UPDATED_TRIGGER",
  "SALESFORCE_OPPORTUNITY_UPDATED_TRIGGER",
  "PIPEDRIVE_NEW_DEAL_TRIGGER",
  "PIPEDRIVE_NEW_ORGANIZATION_TRIGGER",
  // messaging
  "SLACK_CHANNEL_MESSAGE_RECEIVED",
  "SLACK_DIRECT_MESSAGE_RECEIVED",
] as const;

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.error("COMPOSIO_API_KEY not set — run via op run --env-file=.env.1password");
    process.exit(1);
  }

  const composio = new Composio({ apiKey });
  const schemas: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const slug of CAPTURE_TRIGGER_SLUGS) {
    try {
      const type = await composio.triggers.getType(slug);
      schemas[slug] = type;
      console.log(`ok    ${slug}`);
    } catch (error) {
      errors[slug] = error instanceof Error ? error.message : String(error);
      console.error(`FAIL  ${slug}: ${errors[slug]}`);
    }
  }

  const outPath = resolve(
    process.cwd(),
    "app/_features/capture/adapters/__fixtures__/composio-trigger-schemas.json",
  );
  writeFileSync(
    outPath,
    JSON.stringify(
      { pulledAt: new Date().toISOString(), schemas, errors },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${Object.keys(schemas).length} schemas (${Object.keys(errors).length} errors) to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
