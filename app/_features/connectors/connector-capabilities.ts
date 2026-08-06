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

const OUTLOOK_CAPABILITIES: ConnectorCapability[] = [
  // Read tools
  // Message reads use the OUTLOOK_OUTLOOK_* slugs — the un-prefixed ones 404
  // as of 2026-08-06 (Composio toolkit rework).
  {
    id: "outlook-list-messages",
    label: "Search emails",
    description: "Search and read emails in Outlook.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_OUTLOOK_LIST_MESSAGES,
  },
  {
    id: "outlook-get-message",
    label: "Open email",
    description: "Read a specific email message.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_OUTLOOK_GET_MESSAGE,
  },
  {
    id: "outlook-get-calendar-view",
    label: "View calendar",
    description: "See calendar events and availability.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR_VIEW,
  },
  {
    id: "outlook-get-contacts",
    label: "View contacts",
    description: "Browse your Outlook contacts.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CONTACTS,
  },
  {
    id: "outlook-search-emails",
    label: "Search emails",
    description: "Search across your mailbox.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_SEARCH_EMAILS,
  },
  // Write tools
  {
    id: "outlook-create-draft",
    label: "Create drafts",
    description: "Salt prepares drafts — you review and send.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_DRAFT,
  },
  {
    id: "outlook-send-email",
    label: "Send email",
    description: "Send messages after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_SEND_EMAIL,
  },
  {
    id: "outlook-create-event",
    label: "Create events",
    description: "Add meetings to your calendar.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_CALENDAR_CREATE_EVENT,
  },
  {
    id: "outlook-create-contact",
    label: "Add contacts",
    description: "Create new contact records.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_CONTACT,
  },
  {
    id: "outlook-reply-to-email",
    label: "Reply to emails",
    description: "Send replies after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.OUTLOOK_REPLY_TO_EMAIL,
  },
];

const SLACK_CAPABILITIES: ConnectorCapability[] = [
  // Read tools
  {
    id: "slack-conversation-history",
    label: "Read messages",
    description: "Read channel and DM history.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.SLACK_FETCH_CONVERSATION_HISTORY,
  },
  {
    id: "slack-find-channels",
    label: "Find channels",
    description: "Search for channels in your workspace.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.SLACK_FIND_CHANNELS,
  },
  {
    id: "slack-find-users",
    label: "Find users",
    description: "Search for team members.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.SLACK_FIND_USERS,
  },
  {
    id: "slack-search-messages",
    label: "Search messages",
    description: "Search across your Slack workspace.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.SLACK_SEARCH_MESSAGES,
  },
  // Write tools
  {
    id: "slack-post-message",
    label: "Post messages",
    description: "Send messages to channels after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.SLACK_CHAT_POST_MESSAGE,
  },
  {
    id: "slack-send-dm",
    label: "Send direct messages",
    description: "Send DMs after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.SLACK_SEND_DIRECT_MESSAGE,
  },
  {
    id: "slack-add-reaction",
    label: "Add reactions",
    description: "React to messages with emoji.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.SLACK_ADD_REACTION_TO_AN_ITEM,
  },
  {
    id: "slack-create-channel",
    label: "Create channels",
    description: "Set up new channels after you approve.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.SLACK_CREATE_CHANNEL,
  },
];

const HUBSPOT_CAPABILITIES: ConnectorCapability[] = [
  // Read tools
  {
    id: "hubspot-company-activities",
    label: "View company activities",
    description: "See activity history for companies.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_COMPANY_ACTIVITIES,
  },
  {
    id: "hubspot-company-meetings",
    label: "View company meetings",
    description: "See meetings associated with companies.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_COMPANY_MEETINGS,
  },
  {
    id: "hubspot-deal-activities",
    label: "View deal activities",
    description: "See activity history for deals.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_DEAL_ACTIVITIES,
  },
  {
    id: "hubspot-pipeline-audit",
    label: "Pipeline audit",
    description: "See deal stage history and changes.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.HUBSPOT_GET_PIPELINE_STAGE_AUDIT,
  },
  // Write tools
  {
    id: "hubspot-create-contact",
    label: "Create contacts",
    description: "Add new contacts to HubSpot.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_CONTACT_FROM_NL,
  },
  {
    id: "hubspot-create-deal",
    label: "Create deals",
    description: "Add new deals to your pipeline.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_DEAL_FROM_NL,
  },
  {
    id: "hubspot-create-meeting",
    label: "Create meetings",
    description: "Log meetings in HubSpot.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_MEETING,
  },
  {
    id: "hubspot-create-ticket",
    label: "Create tickets",
    description: "Create support tickets.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_TICKETS,
  },
];

const QUICKBOOKS_CAPABILITIES: ConnectorCapability[] = [
  // Read tools
  {
    id: "quickbooks-company-info",
    label: "Company info",
    description: "View your QuickBooks company details.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_COMPANY_INFO,
  },
  {
    id: "quickbooks-balance-sheet",
    label: "Balance sheet",
    description: "View your balance sheet report.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_BALANCE_SHEET_REPORT,
  },
  {
    id: "quickbooks-profit-loss",
    label: "Profit & loss",
    description: "View your P&L statement.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_PROFIT_AND_LOSS_REPORT,
  },
  {
    id: "quickbooks-cash-flow",
    label: "Cash flow",
    description: "View your cash flow report.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_REPORT_CASH_FLOW,
  },
  {
    id: "quickbooks-receivables",
    label: "Aged receivables",
    description: "See outstanding customer balances.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT,
  },
  {
    id: "quickbooks-get-invoice",
    label: "View invoices",
    description: "See invoice details.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_INVOICE,
  },
  // Write tools
  {
    id: "quickbooks-create-invoice",
    label: "Create invoices",
    description: "Create invoices for clients.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_INVOICE,
  },
  {
    id: "quickbooks-create-estimate",
    label: "Create estimates",
    description: "Create quotes and estimates.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_ESTIMATE,
  },
  {
    id: "quickbooks-create-customer",
    label: "Add customers",
    description: "Create customer records.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_CUSTOMER,
  },
  {
    id: "quickbooks-send-invoice",
    label: "Send invoices",
    description: "Email invoices to customers.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_SEND_INVOICE,
  },
];

const DROPBOX_CAPABILITIES: ConnectorCapability[] = [
  // Read tools
  {
    id: "dropbox-search",
    label: "Search files",
    description: "Search across your Dropbox.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.DROPBOX_FILES_SEARCH,
  },
  {
    id: "dropbox-account",
    label: "View account",
    description: "See your Dropbox account info.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.DROPBOX_GET_ACCOUNT,
  },
  {
    id: "dropbox-space",
    label: "Storage usage",
    description: "See your storage quota.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.DROPBOX_GET_SPACE_USAGE,
  },
  {
    id: "dropbox-file-requests",
    label: "File requests",
    description: "See your file request links.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.DROPBOX_LIST_FILE_REQUESTS,
  },
  // Write tools
  {
    id: "dropbox-create-folder",
    label: "Create folders",
    description: "Create new folders.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_FOLDER,
  },
  {
    id: "dropbox-copy",
    label: "Copy files",
    description: "Copy files and folders.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.DROPBOX_COPY_FILE_OR_FOLDER,
  },
  {
    id: "dropbox-share",
    label: "Create share links",
    description: "Generate sharing links.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_SHARED_LINK,
  },
  {
    id: "dropbox-file-request",
    label: "Create file requests",
    description: "Set up file request links.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_FILE_REQUEST,
  },
];

const NOTION_CAPABILITIES: ConnectorCapability[] = [
  // Read tools
  {
    id: "notion-query-database",
    label: "Query databases",
    description: "Search and filter Notion databases.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.NOTION_QUERY_DATABASE,
  },
  {
    id: "notion-get-page",
    label: "Read pages",
    description: "Read page content in markdown.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.NOTION_GET_PAGE_MARKDOWN,
  },
  {
    id: "notion-list-databases",
    label: "List databases",
    description: "See all your Notion databases.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.NOTION_LIST_ALL_DATABASES,
  },
  {
    id: "notion-list-pages",
    label: "List pages",
    description: "Browse your Notion pages.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.NOTION_LIST_ALL_PAGES,
  },
  {
    id: "notion-search",
    label: "Search",
    description: "Search across your Notion workspace.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.NOTION_SEARCH_ENTITY,
  },
  // Write tools
  {
    id: "notion-create-page",
    label: "Create pages",
    description: "Create new Notion pages.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.NOTION_CREATE_NOTION_PAGE,
  },
  {
    id: "notion-insert-row",
    label: "Add database rows",
    description: "Add entries to databases.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.NOTION_INSERT_ROW_DATABASE,
  },
  {
    id: "notion-update-page",
    label: "Update pages",
    description: "Edit page content.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_PAGE,
  },
  {
    id: "notion-create-comment",
    label: "Add comments",
    description: "Comment on pages and blocks.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.NOTION_CREATE_COMMENT,
  },
];

const FIREFLIES_CAPABILITIES: ConnectorCapability[] = [
  // Read tools (all are read-only)
  {
    id: "fireflies-list-meetings",
    label: "List meetings",
    description: "See your recorded meetings.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS,
  },
  {
    id: "fireflies-get-transcript",
    label: "Read transcripts",
    description: "Read meeting transcripts.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT,
  },
  {
    id: "fireflies-search",
    label: "Search transcripts",
    description: "Search across all transcripts.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_TRANSCRIPTS,
  },
  {
    id: "fireflies-analytics",
    label: "Meeting analytics",
    description: "See talk time and sentiment data.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_ANALYTICS,
  },
  {
    id: "fireflies-topics",
    label: "Meeting topics",
    description: "See AI-extracted topics.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_TOPICS,
  },
  {
    id: "fireflies-participants",
    label: "Participants",
    description: "See who attended meetings.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_PARTICIPANTS,
  },
];

const ZOOM_CAPABILITIES: ConnectorCapability[] = [
  // Read tools
  {
    id: "zoom-list-meetings",
    label: "List meetings",
    description: "See scheduled Zoom meetings.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.ZOOM_LIST_MEETINGS,
  },
  {
    id: "zoom-get-meeting",
    label: "Meeting details",
    description: "See meeting info and settings.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.ZOOM_GET_A_MEETING,
  },
  {
    id: "zoom-recordings",
    label: "Recordings",
    description: "Access meeting recordings.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.ZOOM_GET_MEETING_RECORDINGS,
  },
  {
    id: "zoom-summary",
    label: "Meeting summaries",
    description: "See AI meeting summaries.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.ZOOM_GET_A_MEETING_SUMMARY,
  },
  // Write tools
  {
    id: "zoom-create-meeting",
    label: "Create meetings",
    description: "Schedule new Zoom meetings.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.ZOOM_CREATE_A_MEETING,
  },
];

const CAL_CAPABILITIES: ConnectorCapability[] = [
  // Read tools
  {
    id: "cal-event-types",
    label: "View event types",
    description: "See your Cal.com booking types.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES,
  },
  {
    id: "cal-bookings",
    label: "View bookings",
    description: "See team bookings and schedules.",
    risk: "read",
    // CAL_FETCH_ALL_BOOKINGS replaces CAL_GET_TEAM_BOOKINGS (404s 2026-08-06).
    toolSlug: COMPOSIO_TOOL_SLUGS.CAL_FETCH_ALL_BOOKINGS,
  },
  {
    id: "cal-busy-times",
    label: "Check availability",
    description: "See when you're available.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_CALENDAR_BUSY_TIMES,
  },
  {
    id: "cal-calendars",
    label: "List calendars",
    description: "See connected calendars.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_CALENDAR_LIST,
  },
  // Write tools
  {
    id: "cal-add-attendee",
    label: "Add attendees",
    description: "Add people to bookings.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CAL_ADD_ATTENDEE,
  },
  {
    id: "cal-edit-booking",
    label: "Edit bookings",
    description: "Modify existing bookings.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CAL_EDIT_BOOKING_BY_ID,
  },
  {
    id: "cal-reserve-slot",
    label: "Reserve slots",
    description: "Hold time slots for events.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CAL_RESERVE_SLOT_FOR_EVENT,
  },
];

const CALENDLY_CAPABILITIES: ConnectorCapability[] = [
  // Read tools
  {
    id: "calendly-list-event-types",
    label: "View event types",
    description: "See your Calendly event types and booking links.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENT_TYPES,
  },
  {
    id: "calendly-list-scheduled-events",
    label: "View scheduled events",
    description: "See upcoming and past bookings from your Calendly.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_SCHEDULED_EVENTS,
  },
  {
    id: "calendly-get-user",
    label: "View profile",
    description: "Read your Calendly profile settings.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_GET_USER,
  },
  {
    id: "calendly-get-organization",
    label: "View organization",
    description: "Read your Calendly organization details.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_GET_ORGANIZATION,
  },
  {
    id: "calendly-get-availability",
    label: "Check availability",
    description: "See when you're available for a specific event type.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_GET_EVENT_TYPE_AVAILABILITY,
  },
  {
    id: "calendly-list-form-submissions",
    label: "View form submissions",
    description: "See routing form submission data.",
    risk: "read",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_ROUTING_FORM_SUBMISSIONS,
  },
  // Write tools
  {
    id: "calendly-create-event-type",
    label: "Create event types",
    description: "Create new event types for bookings.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_CREATE_EVENT_TYPE,
  },
  {
    id: "calendly-update-event-type",
    label: "Update event types",
    description: "Modify existing event type settings.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_UPDATE_EVENT_TYPE,
  },
  {
    id: "calendly-update-availability",
    label: "Update availability",
    description: "Change availability for an event type.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_UPDATE_EVENT_TYPE_AVAILABILITY,
  },
  {
    id: "calendly-cancel-event",
    label: "Cancel bookings",
    description: "Cancel a scheduled event.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_CANCEL_SCHEDULED_EVENT,
  },
  {
    id: "calendly-add-invitee",
    label: "Add invitees",
    description: "Add an invitee to an event.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_POST_INVITEE,
  },
  {
    id: "calendly-create-webhook",
    label: "Create webhooks",
    description: "Set up webhook notifications.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_CREATE_WEBHOOKS,
  },
  {
    id: "calendly-invite-to-org",
    label: "Invite to organization",
    description: "Send organization invitations.",
    risk: "write",
    toolSlug: COMPOSIO_TOOL_SLUGS.CALENDLY_ORGANIZATION_INVITATION,
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
    case "calendly":
      return groupCapabilities(CALENDLY_CAPABILITIES, [
        "Salt reads your Calendly to see event types, bookings, and availability.",
        "Event type changes and cancellations happen only after you approve each one.",
        "Salt can never delete organization members.",
      ]);
    case "outlook":
      return groupCapabilities(OUTLOOK_CAPABILITIES, [
        "Salt reads your Outlook inbox and calendar for context.",
        "Emails and events are created only after you approve each one.",
        "Salt can never delete emails, contacts, or calendar events.",
      ]);
    case "slack":
      return groupCapabilities(SLACK_CAPABILITIES, [
        "Salt reads channels and messages to understand your team communication.",
        "Messages are sent only after you approve each one.",
        "Salt can never delete messages or channels.",
      ]);
    case "hubspot":
      return groupCapabilities(HUBSPOT_CAPABILITIES, [
        "Salt reads your HubSpot CRM to track companies, deals, and activities.",
        "New contacts, deals, and meetings are created only after you approve.",
        "Salt can never delete CRM records.",
      ]);
    case "quickbooks":
      return groupCapabilities(QUICKBOOKS_CAPABILITIES, [
        "Salt reads your QuickBooks for financial insights and client tracking.",
        "Invoices and estimates are created only after you approve each one.",
        "Salt can never delete financial records.",
      ]);
    case "dropbox":
      return groupCapabilities(DROPBOX_CAPABILITIES, [
        "Salt reads your Dropbox to find and understand files.",
        "Folders and sharing links are created only after you approve.",
        "Salt can never delete files or folders.",
      ]);
    case "notion":
      return groupCapabilities(NOTION_CAPABILITIES, [
        "Salt reads your Notion workspace for project context and notes.",
        "Pages and database entries are created only after you approve.",
        "Salt can never delete pages or databases.",
      ]);
    case "fireflies":
      return groupCapabilities(FIREFLIES_CAPABILITIES, [
        "Salt reads your Fireflies transcripts to extract meeting insights.",
        "All Fireflies tools are read-only — Salt cannot modify your recordings.",
      ]);
    case "zoom":
      return groupCapabilities(ZOOM_CAPABILITIES, [
        "Salt reads your Zoom meetings and recordings.",
        "New meetings are scheduled only after you approve.",
        "Salt can never delete meetings or recordings.",
      ]);
    case "calcom":
      return groupCapabilities(CAL_CAPABILITIES, [
        "Salt reads your Cal.com to see event types and availability.",
        "Booking changes happen only after you approve each one.",
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
    return "cal";
  }
  if (toolSlug.startsWith("FIREFLIES_")) {
    return "fireflies";
  }
  if (toolSlug.startsWith("STRIPE_")) {
    return "stripe";
  }
  if (toolSlug.startsWith("OUTLOOK_")) {
    return "outlook";
  }
  if (toolSlug.startsWith("SLACK_")) {
    return "slack";
  }
  if (toolSlug.startsWith("HUBSPOT_")) {
    return "hubspot";
  }
  if (toolSlug.startsWith("QUICKBOOKS_")) {
    return "quickbooks";
  }
  if (toolSlug.startsWith("CALENDLY_")) {
    return "calendly";
  }
  if (toolSlug.startsWith("DROPBOX_")) {
    return "dropbox";
  }
  if (toolSlug.startsWith("NOTION_")) {
    return "notion";
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
    "outlook",
    "slack",
    "hubspot",
    "quickbooks",
    "dropbox",
    "notion",
    "fireflies",
    "zoom",
    "calcom",
    "calendly",
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
  "outlook",
  "slack",
  "hubspot",
  "quickbooks",
  "dropbox",
  "notion",
  "fireflies",
  "zoom",
  "calcom",
  "calendly",
];

export function supportsToolPreferences(catalogId: ConnectorCatalogId): boolean {
  return TOOL_PREFERENCE_CATALOG_IDS.includes(catalogId);
}
