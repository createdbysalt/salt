import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";

/**
 * Tool Policy Registry — Manual Tool Classifications
 *
 * @deprecated This manual registry is being replaced by:
 * - `tool_classifications` table in the database
 * - `tool-classification-heuristics.ts` for automatic classification
 * - `classification-store.ts` for runtime lookups
 *
 * The heuristic system automatically classifies new tools by slug pattern:
 * - GET_*, LIST_*, SEARCH_*, FETCH_* → read
 * - DELETE_*, REMOVE_* → destructive
 * - CREATE_*, UPDATE_*, SEND_* → mutating
 *
 * Manual overrides are stored in `tool_classifications` with source='manual'.
 *
 * This file is kept for backward compatibility. New tool policies should be
 * added to the database, not here.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
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
  // Cal.com (verified against Composio API 2026-07-13)
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_GET_TEAM_BOOKINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_GET_TEAM_BOOKINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  // Current toolkit (verified live 2026-08-06) — CAL_GET_TEAM_BOOKINGS 404s.
  [COMPOSIO_TOOL_SLUGS.CAL_FETCH_ALL_BOOKINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_FETCH_ALL_BOOKINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_MY_INFORMATION]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_MY_INFORMATION,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_CALENDAR_BUSY_TIMES]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_CALENDAR_BUSY_TIMES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_CALENDAR_LIST]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_CALENDAR_LIST,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_ATTENDEES]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_LIST_ATTENDEES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_ADD_ATTENDEE]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_ADD_ATTENDEE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_EDIT_BOOKING_BY_ID]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_EDIT_BOOKING_BY_ID,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CAL_RESERVE_SLOT_FOR_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.CAL_RESERVE_SLOT_FOR_EVENT,
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
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_TRANSCRIPTS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_TRANSCRIPTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_ASK_FRED_THREAD]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_ASK_FRED_THREAD,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_ASK_FRED_THREADS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_ASK_FRED_THREADS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_ANALYTICS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_ANALYTICS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_PARTICIPANTS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_PARTICIPANTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_TOPICS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_TOPICS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_USER_GROUPS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_USER_GROUPS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_CHANNELS]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_CHANNELS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_SET_USER_ROLE]: {
    slug: COMPOSIO_TOOL_SLUGS.FIREFLIES_SET_USER_ROLE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  // --- Zoom
  [COMPOSIO_TOOL_SLUGS.ZOOM_LIST_MEETINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_LIST_MEETINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_GET_A_MEETING]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_GET_A_MEETING,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_GET_A_MEETING_SUMMARY]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_GET_A_MEETING_SUMMARY,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_GET_MEETING_RECORDINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_GET_MEETING_RECORDINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_GET_USER]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_GET_USER,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_LIST_ALL_RECORDINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_LIST_ALL_RECORDINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_LIST_MEETING_SUMMARY_TEMPLATES]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_LIST_MEETING_SUMMARY_TEMPLATES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_LIST_WEBINAR_REGISTRANTS]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_LIST_WEBINAR_REGISTRANTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_SEARCH_COMPANY_CONTACTS]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_SEARCH_COMPANY_CONTACTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_CREATE_A_MEETING]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_CREATE_A_MEETING,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_DELETE_A_MEETING]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_DELETE_A_MEETING,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.ZOOM_DELETE_RECORDING_FILE]: {
    slug: COMPOSIO_TOOL_SLUGS.ZOOM_DELETE_RECORDING_FILE,
    risk: "destructive",
    requiresHumanConfirmation: true,
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
  // STRIPE_RETRIEVE_SUBSCRIPTION removed — Composio API rejected slug 2026-07-13
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
  // --- Outlook
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_MESSAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_MESSAGE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_LIST_MESSAGES]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_LIST_MESSAGES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  // The OUTLOOK_OUTLOOK_* aliases resolve to the same live slugs as the
  // canonical keys above (Composio reverted the double-prefix rework), so
  // they are not separate entries — duplicate computed keys are a TS error.
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_EVENT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR_VIEW]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR_VIEW,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_SEND_EMAIL]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_SEND_EMAIL,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_DRAFT]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_DRAFT,
    risk: "mutating",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_CALENDAR_CREATE_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_CALENDAR_CREATE_EVENT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_FORWARD_MESSAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_FORWARD_MESSAGE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  // --- Slack
  [COMPOSIO_TOOL_SLUGS.SLACK_FETCH_CONVERSATION_HISTORY]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_FETCH_CONVERSATION_HISTORY,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_FIND_CHANNELS]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_FIND_CHANNELS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_FIND_USERS]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_FIND_USERS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_GET_UNREAD_MESSAGES_FROM_USER]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_GET_UNREAD_MESSAGES_FROM_USER,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_CHAT_POST_MESSAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_CHAT_POST_MESSAGE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_ADD_REACTION_TO_AN_ITEM]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_ADD_REACTION_TO_AN_ITEM,
    risk: "mutating",
    requiresHumanConfirmation: false,
  },
  // --- HubSpot
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_COMPANY_ACTIVITIES]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_COMPANY_ACTIVITIES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_COMPANY_MEETINGS]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_COMPANY_MEETINGS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_DEAL_ACTIVITIES]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_DEAL_ACTIVITIES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_GET_PIPELINE_STAGE_AUDIT]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_GET_PIPELINE_STAGE_AUDIT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_CONTACT_FROM_NL]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_CONTACT_FROM_NL,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_DEAL_FROM_NL]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_DEAL_FROM_NL,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_MEETING]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_MEETING,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  // --- QuickBooks
  // Current toolkit (verified live 2026-08-06) — capture backfill read.
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CUSTOMER_BALANCE_DETAIL]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CUSTOMER_BALANCE_DETAIL,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_COMPANY_INFO]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_COMPANY_INFO,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_BALANCE_SHEET_REPORT]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_BALANCE_SHEET_REPORT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_PROFIT_AND_LOSS_REPORT]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_PROFIT_AND_LOSS_REPORT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_REPORT_CASH_FLOW]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_REPORT_CASH_FLOW,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_CHANGED_ENTITIES]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_CHANGED_ENTITIES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_INVOICE]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_INVOICE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_ESTIMATE]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_ESTIMATE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  // --- Calendly (verified against Composio API 2026-07-13)
  // Current toolkit (verified live 2026-08-06) — capture backfill reads.
  [COMPOSIO_TOOL_SLUGS.CALENDLY_GET_CURRENT_USER]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_GET_CURRENT_USER,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENTS]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENT_INVITEES]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENT_INVITEES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENT_TYPES]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENT_TYPES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_SCHEDULED_EVENTS]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_SCHEDULED_EVENTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_GET_USER]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_GET_USER,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_GET_ORGANIZATION]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_GET_ORGANIZATION,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_GET_EVENT_TYPE_AVAILABILITY]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_GET_EVENT_TYPE_AVAILABILITY,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_ROUTING_FORM_SUBMISSIONS]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_ROUTING_FORM_SUBMISSIONS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_CREATE_EVENT_TYPE]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_CREATE_EVENT_TYPE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_UPDATE_EVENT_TYPE]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_UPDATE_EVENT_TYPE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_UPDATE_EVENT_TYPE_AVAILABILITY]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_UPDATE_EVENT_TYPE_AVAILABILITY,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_CANCEL_SCHEDULED_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_CANCEL_SCHEDULED_EVENT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_POST_INVITEE]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_POST_INVITEE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_CREATE_WEBHOOKS]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_CREATE_WEBHOOKS,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_ORGANIZATION_INVITATION]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_ORGANIZATION_INVITATION,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.CALENDLY_DELETE_ORGANIZATION_MEMBERSHIP]: {
    slug: COMPOSIO_TOOL_SLUGS.CALENDLY_DELETE_ORGANIZATION_MEMBERSHIP,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  // --- Dropbox
  // Current toolkit (verified live 2026-08-06) — capture backfill read.
  [COMPOSIO_TOOL_SLUGS.DROPBOX_LIST_FILES_IN_FOLDER]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_LIST_FILES_IN_FOLDER,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_FILES_SEARCH]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_FILES_SEARCH,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_ACCOUNT]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_GET_ACCOUNT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_SPACE_USAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_GET_SPACE_USAGE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_LIST_FILE_REQUESTS]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_LIST_FILE_REQUESTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_FOLDER]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_FOLDER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_COPY_FILE_OR_FOLDER]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_COPY_FILE_OR_FOLDER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_SHARED_LINK]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_SHARED_LINK,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_DELETE_FILE]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_DELETE_FILE,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  // --- Notion
  [COMPOSIO_TOOL_SLUGS.NOTION_FETCH_DATABASE]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_FETCH_DATABASE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_QUERY_DATABASE]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_QUERY_DATABASE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_GET_PAGE_MARKDOWN]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_GET_PAGE_MARKDOWN,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_LIST_USERS]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_LIST_USERS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_FETCH_BLOCK_CONTENTS]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_FETCH_BLOCK_CONTENTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_CREATE_NOTION_PAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_CREATE_NOTION_PAGE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_INSERT_ROW_DATABASE]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_INSERT_ROW_DATABASE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_DELETE_BLOCK]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_DELETE_BLOCK,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  // --- Additional Notion tools
  [COMPOSIO_TOOL_SLUGS.NOTION_ADD_MULTIPLE_PAGE_CONTENT]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_ADD_MULTIPLE_PAGE_CONTENT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_CREATE_COMMENT]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_CREATE_COMMENT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_CREATE_DATABASE]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_CREATE_DATABASE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_FETCH_ALL_BLOCK_CONTENTS]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_FETCH_ALL_BLOCK_CONTENTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_FETCH_PAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_FETCH_PAGE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_FILTER_PAGE_BY_KEYWORD]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_FILTER_PAGE_BY_KEYWORD,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_LIST_ALL_DATABASES]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_LIST_ALL_DATABASES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_LIST_ALL_PAGES]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_LIST_ALL_PAGES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_SEARCH_ENTITY]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_SEARCH_ENTITY,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_DATABASE]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_DATABASE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_PAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_PAGE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_ROW_IN_DATABASE]: {
    slug: COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_ROW_IN_DATABASE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  // --- Additional Dropbox tools
  [COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_FILE_MEMBER]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_FILE_MEMBER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_FOLDER_MEMBER_ACTION]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_FOLDER_MEMBER_ACTION,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_TEAM_GROUP_MEMBERS]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_TEAM_GROUP_MEMBERS,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_TEAM_MEMBERS]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_TEAM_MEMBERS,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_FILE_REQUEST]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_FILE_REQUEST,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_PAPER_DOCUMENT]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_PAPER_DOCUMENT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_SHARED_LINK_SIMPLE]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_SHARED_LINK_SIMPLE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_TEAM_FOLDER]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_TEAM_FOLDER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_TEAM_GROUP]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_TEAM_GROUP,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_SHARED_FOLDER_METADATA]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_GET_SHARED_FOLDER_METADATA,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_TEAM_INFO]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_GET_TEAM_INFO,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_TEAM_LOG_EVENTS]: {
    slug: COMPOSIO_TOOL_SLUGS.DROPBOX_GET_TEAM_LOG_EVENTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  // --- Additional HubSpot tools
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_CRM_OBJECT_FROM_NL]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_CRM_OBJECT_FROM_NL,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_OBJECT_ASSOCIATION]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_OBJECT_ASSOCIATION,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_PRODUCT]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_PRODUCT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_TICKETS]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_TICKETS,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_READ_ASSOCIATIONS_BATCH]: {
    slug: COMPOSIO_TOOL_SLUGS.HUBSPOT_READ_ASSOCIATIONS_BATCH,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  // --- Additional Slack tools
  [COMPOSIO_TOOL_SLUGS.SLACK_CHAT_UPDATE]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_CHAT_UPDATE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_INFO]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_INFO,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_JOIN]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_JOIN,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_LIST]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_LIST,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_MEMBERS]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_MEMBERS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_REPLIES]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_REPLIES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_CREATE_CHANNEL]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_CREATE_CHANNEL,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_GET_TEAM_INFO]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_GET_TEAM_INFO,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_INVITE_TO_CHANNEL]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_INVITE_TO_CHANNEL,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_SEARCH_MESSAGES]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_SEARCH_MESSAGES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_SEND_DIRECT_MESSAGE]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_SEND_DIRECT_MESSAGE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_SEND_MESSAGE_WEBHOOK]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_SEND_MESSAGE_WEBHOOK,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_UPLOAD_FILE]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_UPLOAD_FILE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.SLACK_USERS_INFO]: {
    slug: COMPOSIO_TOOL_SLUGS.SLACK_USERS_INFO,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  // --- Additional Outlook tools
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR_SCHEDULE]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR_SCHEDULE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  // REMOVED: OUTLOOK_GET_CONTACT, OUTLOOK_GET_CONTACTS, OUTLOOK_GET_MAIL_FOLDERS,
  // OUTLOOK_LIST_CALENDAR_EVENTS — invalid in Composio API as of 2026-07-14
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_LIST_CALENDARS]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_LIST_CALENDARS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  // REMOVED: OUTLOOK_SEARCH_EMAILS — invalid in Composio API as of 2026-07-14
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_CONTACT]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_CONTACT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_DELETE_CONTACT]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_DELETE_CONTACT,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_DELETE_EMAIL]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_DELETE_EMAIL,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_DELETE_EVENT]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_DELETE_EVENT,
    risk: "destructive",
    requiresHumanConfirmation: true,
  },
  // REMOVED: OUTLOOK_REPLY_TO_EMAIL — invalid in Composio API as of 2026-07-14
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_UPDATE_CONTACT]: {
    slug: COMPOSIO_TOOL_SLUGS.OUTLOOK_UPDATE_CONTACT,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  // REMOVED: OUTLOOK_UPDATE_EVENT — invalid in Composio API as of 2026-07-14
  // --- Additional QuickBooks tools
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_FIND_PRODUCTS_AND_SERVICES]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_FIND_PRODUCTS_AND_SERVICES,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_ACCOUNT]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_ACCOUNT,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_INVOICE]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_INVOICE,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_PURCHASE_ORDER]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_PURCHASE_ORDER,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_VENDOR]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_VENDOR,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_LIST_ACCOUNTS]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_LIST_ACCOUNTS,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_QUERY_ENTITY]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_QUERY_ENTITY,
    risk: "read",
    requiresHumanConfirmation: false,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_CUSTOMER]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_CUSTOMER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_PURCHASE_ORDER]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_PURCHASE_ORDER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_SEND_INVOICE]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_SEND_INVOICE,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_UPDATE_CUSTOMER]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_UPDATE_CUSTOMER,
    risk: "mutating",
    requiresHumanConfirmation: true,
  },
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_UPDATE_INVOICE]: {
    slug: COMPOSIO_TOOL_SLUGS.QUICKBOOKS_UPDATE_INVOICE,
    risk: "mutating",
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
