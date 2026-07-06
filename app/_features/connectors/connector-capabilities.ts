import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";
import type { ConnectorCatalogId } from "./types";

/**
 * Fallback cleanup for raw Composio tool descriptions (developer-facing API
 * docs) when no LLM plain-language summary exists yet: first sentence only,
 * code spans and parenthetical API references stripped, hard length cap.
 */
export function humanizeToolDescription(raw: string): string {
  const cleaned = raw
    .replace(/`[^`]*`/g, "") // code spans
    .replace(/\([^)]*\)/g, "") // parenthetical API refs
    .replace(/\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/g, "") // TOOL_SLUG references
    .replace(/^Tool to /i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s/)[0] ?? cleaned;
  const capped =
    firstSentence.length > 110
      ? `${firstSentence.slice(0, 107).trimEnd()}…`
      : firstSentence;
  const finalText = (
    capped.charAt(0).toUpperCase() + capped.slice(1)
  ).replace(/[.;,\s]+$/, "");
  return finalText;
}

export interface ConnectorCapability {
  id: string;
  label: string;
  description?: string;
  risk: "read" | "write";
  toolSlug?: string;
  nativeAction?: string;
}

export interface ConnectorCapabilityGroups {
  read: ConnectorCapability[];
  write: ConnectorCapability[];
  overviewBullets: string[];
}

const GMAIL_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "gmail-list-messages",
    label: "Search emails",
    description: "Search and read emails in Gmail.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
  },
  {
    id: "gmail-get-message",
    label: "Open email thread",
    description: "Read a specific message and its thread context.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE,
  },
  {
    id: "gmail-list-labels",
    label: "List labels",
    description: "See folders and labels for organization.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS,
  },
  {
    id: "gmail-create-draft",
    label: "Create email drafts",
    description: "Salt prepares drafts in your Gmail — you review and hit send.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT,
  },
  {
    id: "gmail-send-email",
    label: "Send an email",
    description: "Send messages on your behalf after you approve. Only in Send mode.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
  },
];

// Deleting events is destructive-class: Salt can never execute it, so it is
// not offered as a capability or a toggle.
const CALENDAR_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "calendar-list-events",
    label: "Search calendar events",
    description: "Search Google Calendar events and availability.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS,
  },
  {
    id: "calendar-create-event",
    label: "Create calendar events",
    description: "Add meetings and holds to your calendar.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT,
  },
  {
    id: "calendar-update-event",
    label: "Update calendar events",
    description: "Change times, titles, or attendees.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT,
  },
];

// Delete, trash, and sharing/permission changes are destructive-class for
// Drive: Salt can never execute them, so they are not offered as capabilities.
const DRIVE_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "drive-find-file",
    label: "Find files",
    description: "Search files and folders across your Drive.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_FIND_FILE,
  },
  {
    id: "drive-list-files",
    label: "Browse folders",
    description: "List folder contents and file details.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_LIST_FILES,
  },
  {
    id: "drive-read-file",
    label: "Read file contents",
    description: "Open and understand documents for context.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_PARSE_FILE,
  },
  {
    id: "drive-move-file",
    label: "Move files",
    description: "Reorganize files into the right folders.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_MOVE_FILE,
  },
  {
    id: "drive-create-folder",
    label: "Create folders",
    description: "Set up folder structures for projects and clients.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_CREATE_FOLDER,
  },
  {
    id: "drive-copy-file",
    label: "Copy files",
    description: "Duplicate templates and working files.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_COPY_FILE,
  },
  {
    id: "drive-create-file",
    label: "Create files",
    description: "Save new files Salt prepares for you.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_CREATE_FILE_FROM_TEXT,
  },
];

const DOCS_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "docs-search",
    label: "Search documents",
    description: "Find documents by name or content.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_SEARCH_DOCUMENTS,
  },
  {
    id: "docs-read",
    label: "Read documents",
    description: "Open a document and understand its content.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_GET_DOCUMENT,
  },
  {
    id: "docs-create",
    label: "Create documents",
    description: "Draft new documents — proposals, briefs, notes.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN,
  },
  {
    id: "docs-update",
    label: "Update documents",
    description: "Revise document content after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_UPDATE_DOCUMENT_MARKDOWN,
  },
];

const SHEETS_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "sheets-search",
    label: "Find spreadsheets",
    description: "Search spreadsheets across your Drive.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_SEARCH_SPREADSHEETS,
  },
  {
    id: "sheets-read",
    label: "Read sheet data",
    description: "Read values, tabs, and structure.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_BATCH_GET,
  },
  {
    id: "sheets-create",
    label: "Create spreadsheets",
    description: "Set up new trackers and tables.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_CREATE_SPREADSHEET,
  },
  {
    id: "sheets-append",
    label: "Add rows",
    description: "Append data to existing sheets after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_VALUES_APPEND,
  },
];

const SLIDES_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "slides-read",
    label: "Read presentations",
    description: "Open decks and understand their content.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_GET_PRESENTATION,
  },
  {
    id: "slides-create",
    label: "Create presentations",
    description: "Draft new decks from your content.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_CREATE_FROM_MARKDOWN,
  },
];

// Deleting customers is destructive-class: Salt can never execute it, so it
// is not offered as a capability or a toggle.
const STRIPE_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "stripe-list-customers",
    label: "See customers",
    description: "Browse and search the customers in your Stripe account.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CUSTOMERS,
  },
  {
    id: "stripe-list-invoices",
    label: "Review invoices",
    description: "See invoice status — paid, open, and overdue.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_INVOICES,
  },
  {
    id: "stripe-list-subscriptions",
    label: "Track subscriptions",
    description: "See active retainers and recurring revenue.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_SUBSCRIPTIONS,
  },
  {
    id: "stripe-list-charges",
    label: "Payment history",
    description: "Review charges and payment activity.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CHARGES,
  },
  {
    id: "stripe-balance",
    label: "Balance",
    description: "See your available and pending Stripe balance.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_BALANCE,
  },
  {
    id: "stripe-create-customer",
    label: "Add customers",
    description: "Create customer records for new clients after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_CUSTOMER,
  },
  {
    id: "stripe-create-invoice",
    label: "Draft invoices",
    description:
      "Salt prepares draft invoices in your Stripe — you review and send.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_INVOICE,
  },
  {
    id: "stripe-create-subscription",
    label: "Set up subscriptions",
    description: "Create recurring billing for retainers after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_SUBSCRIPTION,
  },
  {
    id: "stripe-create-refund",
    label: "Issue refunds",
    description: "Refund a payment only after you approve it.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_REFUND,
  },
];

function groupCapabilities(
  capabilities: ConnectorCapability[],
  overviewBullets: string[],
): ConnectorCapabilityGroups {
  return {
    read: capabilities.filter((capability) => capability.risk === "read"),
    write: capabilities.filter((capability) => capability.risk === "write"),
    overviewBullets,
  };
}

export function getConnectorCapabilities(
  catalogId: ConnectorCatalogId,
): ConnectorCapabilityGroups | null {
  // Curated capability copy is Salt's judgment per connector — it stays in
  // code; the catalog itself is DB-driven (connector-platform Phase 2.5).
  switch (catalogId) {
    case "google":
      return groupCapabilities(GMAIL_CAPABILITIES, [
        "Search your Gmail inbox so Salt can surface what matters in HQ and Plays.",
        "Read messages and thread context before drafting replies or play steps.",
        "Send email only after you explicitly approve each message.",
        "Salt can never delete or trash your email.",
      ]);
    case "google-calendar":
      return groupCapabilities(CALENDAR_CAPABILITIES, [
        "See calendar events and availability so Salt can prepare scheduling steps.",
        "Create and update meetings only when you approve each action.",
        "Salt can never delete calendar events.",
        "Disable write tools if you only want Salt to read availability.",
        "Connected Gmail before Calendar became its own connector? Connect Calendar here to keep using scheduling tools.",
      ]);
    case "google-drive":
      return groupCapabilities(DRIVE_CAPABILITIES, [
        "Salt reads files and folders to understand your client work.",
        "Moves, copies, and new folders happen only after you approve each one.",
        "Salt can never delete files, empty trash, or change who files are shared with.",
      ]);
    case "google-docs":
      return groupCapabilities(DOCS_CAPABILITIES, [
        "Salt reads documents for context and drafts new ones for your review.",
        "Document creation and edits happen only after you approve each one.",
        "Salt can never delete documents.",
      ]);
    case "google-sheets":
      return groupCapabilities(SHEETS_CAPABILITIES, [
        "Salt reads spreadsheet data to track your business.",
        "New sheets and added rows happen only after you approve each one.",
        "Salt can never delete sheets or clear data.",
      ]);
    case "google-slides":
      return groupCapabilities(SLIDES_CAPABILITIES, [
        "Salt reads presentations for context and drafts new decks.",
        "Deck creation happens only after you approve each one.",
        "Salt can never delete presentations.",
      ]);
    case "stripe":
      return groupCapabilities(STRIPE_CAPABILITIES, [
        "Salt reads your Stripe account to track revenue, invoices, and subscriptions.",
        "Invoices are always created as drafts — you review and send them from Stripe.",
        "Subscriptions, refunds, and customer changes happen only after you approve each one.",
        "Salt can never delete customers or their payment history.",
        "Your monthly Salt subscription is separate and is not affected by this connection.",
      ]);
    default:
      // No curated tool list yet — return empty groups so the detail modal
      // still opens (name, description, connect CTA, connectHelp). Returning
      // null here made every Phase 2 connector's "View details" click a
      // silent no-op.
      return { read: [], write: [], overviewBullets: [] };
  }
}

/** Composio workspace_integrations.provider for tool enforcement and config storage. */
export function getComposioProviderForToolSlug(toolSlug: string): string | null {
  if (toolSlug.startsWith("GMAIL_")) {
    return "gmail";
  }
  if (toolSlug.startsWith("GOOGLECALENDAR_")) {
    return "googlecalendar";
  }
  if (toolSlug.startsWith("GOOGLEDRIVE_")) {
    return "googledrive";
  }
  if (toolSlug.startsWith("GOOGLEDOCS_")) {
    return "googledocs";
  }
  if (toolSlug.startsWith("GOOGLESHEETS_")) {
    return "googlesheets";
  }
  if (toolSlug.startsWith("GOOGLESLIDES_")) {
    return "googleslides";
  }
  if (toolSlug.startsWith("CAL_")) {
    return "calcom";
  }
  if (toolSlug.startsWith("FIREFLIES_")) {
    return "fireflies";
  }
  if (toolSlug.startsWith("STRIPE_")) {
    return "stripe";
  }
  return null;
}

/** Providers with per-tool toggles and trust-ladder settings. */
export function getToolPreferenceProviders(): readonly string[] {
  return [
    "gmail",
    "googlecalendar",
    "googledrive",
    "googledocs",
    "googlesheets",
    "googleslides",
    "stripe",
  ];
}

/** @deprecated Use getToolPreferenceProviders — the list is no longer Google-only. */
export const getGoogleToolPreferenceProviders = getToolPreferenceProviders;

const TOOL_PREFERENCE_CATALOG_IDS: readonly ConnectorCatalogId[] = [
  "google",
  "google-calendar",
  "google-drive",
  "google-docs",
  "google-sheets",
  "google-slides",
  "stripe",
];

export function supportsToolPreferences(catalogId: ConnectorCatalogId): boolean {
  return TOOL_PREFERENCE_CATALOG_IDS.includes(catalogId);
}
