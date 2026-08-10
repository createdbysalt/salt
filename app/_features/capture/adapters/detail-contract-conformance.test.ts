import { describe, it, expect } from "vitest";
import {
  getAdapterForCategory,
  listCategoryAdapters,
} from "./categories";
import {
  runAdapterConformance,
  type AdapterFixture,
} from "./adapter-conformance";
import {
  GMAIL_TRIGGER_CAMEL,
  GMAIL_FETCH_ROW,
} from "./__fixtures__/gmail-trigger-payloads";
import {
  CALENDAR_EVENT_TIMED,
  CALENDAR_TRIGGER_EVENT_CREATED,
} from "./__fixtures__/googlecalendar-payloads";
import { CAL_BOOKING_UPCOMING } from "./__fixtures__/cal-payloads";
import {
  STRIPE_TRIGGER_INVOICE_PAYMENT_SUCCEEDED,
  STRIPE_TRIGGER_CHARGE_FAILED,
} from "./__fixtures__/stripe-payloads";
import { DRIVE_FILE_DOC } from "./__fixtures__/googledrive-payloads";
import {
  SLACK_TRIGGER_CHANNEL_MESSAGE,
  SLACK_TRIGGER_DIRECT_MESSAGE,
} from "./__fixtures__/slack-payloads";
import { HUBSPOT_TRIGGER_CONTACT_CREATED } from "./__fixtures__/hubspot-payloads";
import { NOTION_TRIGGER_PAGE_CREATED } from "./__fixtures__/notion-payloads";
import { GOOGLEDOCS_TRIGGER_DOCUMENT_CREATED } from "./__fixtures__/googledocs-payloads";
import { GOOGLESHEETS_TRIGGER_SPREADSHEET_CREATED } from "./__fixtures__/googlesheets-payloads";
import { GOOGLESLIDES_TRIGGER_SLIDE_ADDED } from "./__fixtures__/googleslides-payloads";
import { OUTLOOK_MESSAGE_HYDRATED } from "./__fixtures__/outlook-payloads";
import {
  OUTLOOK_EVENT_TRIGGER_POINTER,
  OUTLOOK_CALENDAR_EVENT_HYDRATED,
} from "./__fixtures__/outlook-calendar-payloads";
import { QUICKBOOKS_INVOICE_BACKFILL } from "./__fixtures__/quickbooks-payloads";
import { DROPBOX_FILE_ENTRY } from "./__fixtures__/dropbox-payloads";
import { ONEDRIVE_DRIVE_ITEM } from "./__fixtures__/onedrive-payloads";
import {
  PIPEDRIVE_TRIGGER_NEW_DEAL,
  PIPEDRIVE_TRIGGER_NEW_ORGANIZATION,
} from "./__fixtures__/pipedrive-payloads";
import { FIREFLIES_TRANSCRIPT } from "./__fixtures__/fireflies-payloads";

/**
 * Detail-contract conformance (capture quality repair, Phase D).
 *
 * docs/architecture/capture-detail-contract.md defines what each provider's
 * capture must carry for the card to be useful. This suite pins that contract:
 * every provider with live trigger slugs MUST have a golden fixture here
 * asserting the contract fields are populated — add a trigger without a
 * fixture and the coverage test fails.
 *
 * Pointer-only trigger shapes (HubSpot, Outlook Calendar trigger) assert
 * `needs_hydration` instead of content fields — that IS their contract.
 */

const CONTRACT_SUITES: Record<string, AdapterFixture[]> = {
  // ── email ────────────────────────────────────────────────────────────
  gmail: [
    {
      name: "GMAIL_NEW_GMAIL_MESSAGE (camel trigger)",
      payload: GMAIL_TRIGGER_CAMEL,
      expectExternalId: "197a2f0c8d4e1a2c",
      expectContractFields: [
        "subject",
        "snippet",
        "sender_email",
        "sender_name",
        "to",
        "labels",
        "thread_id",
        "deep_link",
      ],
    },
    {
      name: "GMAIL_FETCH_EMAILS row (backfill)",
      payload: GMAIL_FETCH_ROW,
      expectExternalId: "198d6f40c1825d60",
      expectContractFields: ["subject", "sender_email", "thread_id", "deep_link"],
    },
  ],
  outlook: [
    {
      name: "OUTLOOK_MESSAGE_TRIGGER (Graph message)",
      payload: OUTLOOK_MESSAGE_HYDRATED,
      expectExternalId: "AAMkOutlookMsg123",
      expectContractFields: [
        "subject",
        "snippet",
        "sender_email",
        "sender_name",
        "to",
        "thread_id",
        "deep_link",
      ],
    },
  ],

  // ── calendar ─────────────────────────────────────────────────────────
  googlecalendar: [
    {
      name: "API event resource (backfill/hydrated)",
      payload: CALENDAR_EVENT_TIMED,
      expectExternalId: "6ku8m2p4v9d1c3e5",
      expectContractFields: [
        "summary",
        "start",
        "end",
        "organizer_email",
        "attendees",
        "status",
        "deep_link",
      ],
    },
    {
      name: "EVENT_CREATED trigger (flat, no attendees by design)",
      payload: CALENDAR_TRIGGER_EVENT_CREATED,
      expectExternalId: "1pz3r7u9a4i6h8j0",
      expectContractFields: ["summary", "start", "end", "organizer_email"],
    },
  ],
  outlook_calendar: [
    {
      name: "OUTLOOK_EVENT_TRIGGER pointer (needs hydration)",
      payload: OUTLOOK_EVENT_TRIGGER_POINTER,
      expectExternalId: "AAMkEvtPointer1",
      expectContractFields: ["needs_hydration"],
    },
    {
      name: "Graph event resource (hydrated)",
      payload: OUTLOOK_CALENDAR_EVENT_HYDRATED,
      expectExternalId: "AAMkEvtFull1",
      expectContractFields: [
        "summary",
        "start",
        "end",
        "organizer_email",
        "attendees",
        "location",
        "meeting_link",
        "deep_link",
      ],
    },
  ],
  cal: [
    {
      name: "Cal.com booking (backfill)",
      payload: CAL_BOOKING_UPCOMING,
      expectExternalId: "4182931",
      expectContractFields: ["title", "start", "end", "status"],
    },
  ],

  // ── billing ──────────────────────────────────────────────────────────
  stripe: [
    {
      name: "invoice.payment_succeeded",
      payload: STRIPE_TRIGGER_INVOICE_PAYMENT_SUCCEEDED,
      expectExternalId: "in_1PZq8cLkdIwHu7ix5CuNy5tI",
      expectContractFields: [
        "event_type",
        "customer_email",
        "customer_name",
        "amount",
        "currency",
        "status",
        "invoice_number",
      ],
    },
    {
      name: "charge.failed",
      payload: STRIPE_TRIGGER_CHARGE_FAILED,
      expectExternalId: "ch_3Qu2gOkdIwHu7ixB0AtEbBzO",
      expectContractFields: ["event_type", "amount", "currency"],
    },
  ],
  quickbooks: [
    {
      name: "QuickBooks invoice (backfill)",
      payload: QUICKBOOKS_INVOICE_BACKFILL,
      expectExternalId: "1042",
      expectContractFields: [
        "amount",
        "currency",
        "status",
        "invoice_number",
        "due_date",
        "customer_email",
      ],
    },
  ],

  // ── storage ──────────────────────────────────────────────────────────
  googledrive: [
    {
      name: "Drive file resource",
      payload: DRIVE_FILE_DOC,
      expectExternalId: "1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
      expectContractFields: [
        "file_name",
        "mime_type",
        "owner_email",
        "owner_name",
        "web_view_link",
        "deep_link",
      ],
    },
  ],
  dropbox: [
    {
      name: "Dropbox file entry (backfill)",
      payload: DROPBOX_FILE_ENTRY,
      expectExternalId: "id:a4ayc_80_OEAAAAAAAAAYa",
      expectContractFields: [
        "file_name",
        "folder_path",
        "file_size",
        "owner_email",
        "deep_link",
      ],
    },
  ],
  onedrive: [
    {
      name: "Graph driveItem (backfill)",
      payload: ONEDRIVE_DRIVE_ITEM,
      expectExternalId: "01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36K",
      expectContractFields: [
        "file_name",
        "folder_path",
        "owner_email",
        "mime_type",
        "file_size",
        "deep_link",
      ],
    },
  ],

  // ── communication ────────────────────────────────────────────────────
  slack: [
    {
      name: "channel message trigger",
      payload: SLACK_TRIGGER_CHANNEL_MESSAGE,
      expectExternalId: "C0123456789:1754407800.000200",
      expectContractFields: ["text", "channel", "channel_type", "sender_id"],
    },
    {
      name: "direct message trigger",
      payload: SLACK_TRIGGER_DIRECT_MESSAGE,
      expectExternalId: "D0987654321:1754410500.000101",
      expectContractFields: ["text", "channel_type", "sender_id", "is_dm"],
    },
  ],

  // ── crm ──────────────────────────────────────────────────────────────
  hubspot: [
    {
      name: "contact created trigger (pointer — hydration is the contract)",
      payload: HUBSPOT_TRIGGER_CONTACT_CREATED,
      expectExternalId: "contact.creation:901234567",
      expectContractFields: ["object_id", "needs_hydration"],
    },
  ],
  pipedrive: [
    {
      name: "new deal trigger",
      payload: PIPEDRIVE_TRIGGER_NEW_DEAL,
      expectExternalId: "deal:42",
      expectContractFields: [
        "entity_type",
        "entity_name",
        "deal_value",
        "currency",
        "status",
        "stage",
      ],
    },
    {
      name: "new organization trigger",
      payload: PIPEDRIVE_TRIGGER_NEW_ORGANIZATION,
      expectExternalId: "organization:77",
      expectContractFields: ["entity_type", "entity_name", "email"],
    },
  ],

  // ── meetings ─────────────────────────────────────────────────────────
  fireflies: [
    {
      name: "Fireflies transcript (backfill)",
      payload: FIREFLIES_TRANSCRIPT,
      expectExternalId: "tr-abc123",
      expectContractFields: [
        "duration_minutes",
        "participants",
        "summary",
        "action_items",
        "deep_link",
      ],
    },
  ],

  // ── documents ────────────────────────────────────────────────────────
  // Notion's trigger payload is ID-only (no title/url until hydration) —
  // event_type is the only contract field the payload can populate.
  notion: [
    {
      name: "NOTION_PAGE_CREATED trigger",
      payload: NOTION_TRIGGER_PAGE_CREATED,
      expectExternalId: "f0e1d2c3-b4a5-6f7e-8d9c-0b1a2f3e4d5c",
      expectContractFields: ["event_type"],
    },
  ],
  googledocs: [
    {
      name: "DOCUMENT_CREATED trigger",
      payload: GOOGLEDOCS_TRIGGER_DOCUMENT_CREATED,
      expectExternalId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      expectContractFields: ["title", "url", "event_type"],
    },
  ],
  googlesheets: [
    {
      name: "SPREADSHEET_CREATED trigger",
      payload: GOOGLESHEETS_TRIGGER_SPREADSHEET_CREATED,
      expectExternalId: "1SpReAdShEeTiD0123456789AbCdEfGhIjKlMn",
      expectContractFields: ["title", "url", "event_type"],
    },
  ],
  googleslides: [
    {
      name: "SLIDE_ADDED trigger",
      payload: GOOGLESLIDES_TRIGGER_SLIDE_ADDED,
      expectExternalId: "SLIDES_API1234567890",
      expectContractFields: ["event_type"],
    },
  ],
};

describe("capture detail-contract conformance", () => {
  // provider → category from the hardcoded known-provider list. The enrichment
  // registry's DB-backed lookup doesn't cover every known provider, so resolve
  // adapters by category directly.
  const providerCategories = new Map(
    listCategoryAdapters().flatMap(({ category, providers }) =>
      providers.map((provider) => [provider, category] as const),
    ),
  );

  it("covers every provider with live trigger slugs", () => {
    for (const [provider, category] of providerCategories) {
      const adapter = getAdapterForCategory(category, provider);
      if (adapter.triggerSlugs.length === 0) continue;
      const covered = provider in CONTRACT_SUITES;
      expect(
        covered,
        `provider '${provider}' has trigger slugs [${adapter.triggerSlugs.join(", ")}] but no contract fixture — add one to CONTRACT_SUITES (see capture-detail-contract.md)`,
      ).toBe(true);
    }
  });

  for (const [provider, fixtures] of Object.entries(CONTRACT_SUITES)) {
    it(`${provider}: fixtures populate the detail contract`, () => {
      const category = providerCategories.get(provider);
      expect(category, `provider '${provider}' not in listCategoryAdapters`).toBeDefined();
      runAdapterConformance(getAdapterForCategory(category!, provider), fixtures);
    });
  }
});
