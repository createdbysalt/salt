import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
/**
 * `destructive` tools are policy-known but can never be executed by Salt —
 * not even with human approval. Deletions happen in the source app, not here.
 */
export type ToolRiskClass = "read" | "mutating" | "destructive";

export interface ComposioToolPolicy {
  slug: string;
  risk: ToolRiskClass;
  requiresHumanConfirmation: boolean;
}

const TOOL_POLICIES: Record<string, ComposioToolPolicy> = {
  [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: {
    slug: COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  // Drafts are invisible outside the user's own mailbox until they hit send
  // in Gmail, so draft creation auto-executes (still logged in the audit
  // trail). This powers the workspace "draft mode" for email.
  [COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT]: {
    slug: COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT,
    risk: "mutating",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: {
    slug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS]: {
    slug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_CREATE_BOOKING]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_CREATE_BOOKING,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_BOOKINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_LIST_BOOKINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_CANCEL_BOOKING]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_CANCEL_BOOKING,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_MEETINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_MEETINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  // --- Google Drive: read auto-runs; organize (move/copy/folder/create) needs
  // approval; delete, trash, and any permission/sharing change (exfiltration
  // vector) are destructive and unreachable.
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_FIND_FILE]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_FIND_FILE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_FIND_FOLDER]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_FIND_FOLDER,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_LIST_FILES]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_LIST_FILES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_GET_FILE_METADATA]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_GET_FILE_METADATA,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_PARSE_FILE]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_PARSE_FILE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_MOVE_FILE]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_MOVE_FILE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_CREATE_FOLDER]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_CREATE_FOLDER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_COPY_FILE]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_COPY_FILE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_CREATE_FILE_FROM_TEXT]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_CREATE_FILE_FROM_TEXT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_DELETE_FILE]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_DELETE_FILE,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_EMPTY_TRASH]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_EMPTY_TRASH,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_SHARE_FILE]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_SHARE_FILE,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_UPDATE_PERMISSION]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_UPDATE_PERMISSION,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_DELETE_PERMISSION]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_DELETE_PERMISSION,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  // --- Google Docs
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_GET_DOCUMENT]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_GET_DOCUMENT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_SEARCH_DOCUMENTS]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_SEARCH_DOCUMENTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_UPDATE_DOCUMENT_MARKDOWN]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_UPDATE_DOCUMENT_MARKDOWN,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_DELETE_CONTENT_RANGE]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_DELETE_CONTENT_RANGE,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  // --- Google Sheets
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_GET_SPREADSHEET_INFO]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_GET_SPREADSHEET_INFO,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_GET_SHEET_NAMES]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_GET_SHEET_NAMES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_BATCH_GET]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_BATCH_GET,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_SEARCH_SPREADSHEETS]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_SEARCH_SPREADSHEETS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_CREATE_SPREADSHEET]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_CREATE_SPREADSHEET,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_VALUES_APPEND]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_VALUES_APPEND,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_DELETE_SHEET]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_DELETE_SHEET,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_CLEAR_VALUES]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_CLEAR_VALUES,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  // --- Google Slides
  [COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_GET_PRESENTATION]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_GET_PRESENTATION,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_GET_PAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_GET_PAGE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_CREATE_FROM_MARKDOWN]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_CREATE_FROM_MARKDOWN,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_CREATE_PRESENTATION]: {
    slug: COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_CREATE_PRESENTATION,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  // --- Stripe: the user's own Stripe account (money + customer-visible).
  // Reads auto-run. Every write needs approval — including invoice creation,
  // because Stripe drafts auto-finalize via auto_advance and become
  // customer-visible, unlike Gmail drafts. Cancel subscription and refunds
  // are reversible business actions → approval (cancel-booking precedent).
  // Deleting a customer destroys history and is unreachable.
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CUSTOMERS]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CUSTOMERS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_SEARCH_CUSTOMERS]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_SEARCH_CUSTOMERS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_CUSTOMER]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_CUSTOMER,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_INVOICES]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_INVOICES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_SUBSCRIPTIONS]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_SUBSCRIPTIONS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_SUBSCRIPTION]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_SUBSCRIPTION,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CHARGES]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CHARGES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_CHARGE]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_CHARGE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_BALANCE]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_BALANCE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_PRODUCTS]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_PRODUCTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_PAYMENT_LINKS]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_PAYMENT_LINKS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_REFUNDS]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_LIST_REFUNDS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_CUSTOMER]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_CUSTOMER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_UPDATE_CUSTOMER]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_UPDATE_CUSTOMER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_INVOICE]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_INVOICE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_SUBSCRIPTION]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_SUBSCRIPTION,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_UPDATE_SUBSCRIPTION]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_UPDATE_SUBSCRIPTION,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_CANCEL_SUBSCRIPTION]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_CANCEL_SUBSCRIPTION,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_PRODUCT]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_PRODUCT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_PRICE]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_PRICE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_REFUND]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_REFUND,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.STRIPE_DELETE_CUSTOMER]: {
    slug: COMPOSIO_TOOL_SLUGS.STRIPE_DELETE_CUSTOMER,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
};

export function getComposioToolPolicy(toolSlug: string): ComposioToolPolicy | null {
  return TOOL_POLICIES[toolSlug] ?? TOOL_POLICIES[toolSlug.toUpperCase()] ?? null;
}

/** Tool slugs Salt's agent may ever see (everything policy-known except destructive). */
export function listAgentExposableToolSlugs(): string[] {
  return Object.values(TOOL_POLICIES)
    .filter((policy) => policy.risk !== "destructive")
    .map((policy) => policy.slug);
}
