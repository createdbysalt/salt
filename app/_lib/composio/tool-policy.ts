import "server-only";

import { z } from "zod";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import {
  getComposioToolPolicy,
  listAgentExposableToolSlugs,
  type ComposioToolPolicy,
} from "./tool-policy-registry";
export type { ToolRiskClass, ComposioToolPolicy } from "./tool-policy-registry";
export { getComposioToolPolicy, listAgentExposableToolSlugs };

/**
 * Pre-approved play execution context. Enabling a play records consent for
 * its declared action slugs; play steps may then run those mutating tools
 * without a per-action approval card. Destructive tools stay unreachable.
 */
export interface PlayApprovalContext {
  /** Tool slugs the user consented to when enabling the play. */
  approvedActions: readonly string[];
}

export interface ComposioToolAllowOptions {
  disabledTools?: readonly string[];
  /** Unattended contexts (background scans, scheduled jobs) may only run read tools. */
  unattended?: boolean;
  /** Present when executing inside a pre-approved play run. */
  play?: PlayApprovalContext;
  /**
   * Resolved classification from the DB store (connector-platform Phase 2.4).
   * `null` = no approved classification → fail closed. When the key is
   * omitted entirely, the legacy in-code registry is consulted (kept until
   * Phase 2.5 retires it).
   */
  policy?: ComposioToolPolicy | null;
}

export function assertComposioToolAllowed(
  toolSlug: string,
  options?: ComposioToolAllowOptions,
): ComposioToolPolicy {
  const policy =
    options && "policy" in options
      ? options.policy
      : getComposioToolPolicy(toolSlug);
  if (!policy) {
    throw new Error(
      `Composio tool not approved for execution (no approved classification): ${toolSlug}`,
    );
  }

  if (policy.risk === "destructive") {
    throw new Error(
      `Composio tool ${toolSlug} is destructive and can never be executed by Salt`,
    );
  }

  if (options?.unattended && policy.risk !== "read") {
    throw new Error(
      `Composio tool ${toolSlug} is ${policy.risk} and cannot run in an unattended context`,
    );
  }

  if (options?.play && policy.risk === "mutating") {
    if (!options.play.approvedActions.includes(toolSlug)) {
      throw new Error(
        `Composio tool ${toolSlug} is not in this play's approved actions`,
      );
    }
  }

  if (options?.disabledTools?.includes(toolSlug)) {
    throw new Error(`Composio tool disabled for this workspace: ${toolSlug}`);
  }

  return policy;
}

/** True when a play's recorded consent covers this mutating slug. */
export function isPlayApprovedAction(
  toolSlug: string,
  play: PlayApprovalContext | undefined,
): boolean {
  return Boolean(play?.approvedActions.includes(toolSlug));
}

/**
 * Per-tool runtime argument validation before execute().
 * Shapes verified against the live Composio tool schemas
 * (`GET /api/v3/tools/<slug>`) on 2026-06-11 — keys here must match the real
 * tool input parameters or every valid call gets rejected.
 */
export const composioToolInputSchemas: Record<string, z.ZodTypeAny> = {
  [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: z
    .object({
      recipient_email: z.string().min(1),
      subject: z.string().min(1),
      body: z.string().min(1),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
      extra_recipients: z.array(z.string()).optional(),
      is_html: z.boolean().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT]: z
    .object({
      recipient_email: z.string().min(1),
      subject: z.string().min(1),
      body: z.string().min(1),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
      extra_recipients: z.array(z.string()).optional(),
      thread_id: z.string().optional(),
      is_html: z.boolean().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: z
    .object({
      query: z.string().optional(),
      max_results: z.number().int().positive().max(100).optional(),
      label_ids: z.array(z.string()).optional(),
      page_token: z.string().optional(),
      include_payload: z.boolean().optional(),
      verbose: z.boolean().optional(),
      ids_only: z.boolean().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE]: z
    .object({
      message_id: z.string().min(1),
      format: z.string().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT]: z
    .object({
      start_datetime: z.string().min(1),
      summary: z.string().optional(),
      description: z.string().optional(),
      attendees: z.array(z.string()).optional(),
      event_duration_hour: z.number().int().min(0).optional(),
      event_duration_minutes: z.number().int().min(0).optional(),
      timezone: z.string().optional(),
      calendar_id: z.string().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS]: z
    .object({
      calendarId: z.string().optional(),
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      maxResults: z.number().int().positive().max(250).optional(),
      orderBy: z.string().optional(),
      q: z.string().optional(),
      singleEvents: z.boolean().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT]: z
    .object({
      event_id: z.string().min(1),
      start_datetime: z.string().min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT]: z.object({
    event_id: z.string().min(1),
    calendar_id: z.string().optional(),
  }),
  // Cal.com (verified against Composio API 2026-07-13)
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_GET_TEAM_BOOKINGS]: z.object({}).passthrough(),
  // Current toolkit (verified live 2026-08-06) — CAL_GET_TEAM_BOOKINGS 404s.
  [COMPOSIO_TOOL_SLUGS.CAL_FETCH_ALL_BOOKINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_MY_INFORMATION]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_CALENDAR_BUSY_TIMES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_RETRIEVE_CALENDAR_LIST]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_ATTENDEES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_ADD_ATTENDEE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_EDIT_BOOKING_BY_ID]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_RESERVE_SLOT_FOR_EVENT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_TRANSCRIPTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_ASK_FRED_THREAD]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_ASK_FRED_THREADS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_ANALYTICS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_PARTICIPANTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_MEETING_TOPICS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_USER_GROUPS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_CHANNELS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_SET_USER_ROLE]: z.object({}).passthrough(),
  // Zoom (verified against Composio API 2026-07-13)
  [COMPOSIO_TOOL_SLUGS.ZOOM_LIST_MEETINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.ZOOM_GET_A_MEETING]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.ZOOM_GET_A_MEETING_SUMMARY]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.ZOOM_GET_MEETING_RECORDINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.ZOOM_GET_USER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.ZOOM_LIST_ALL_RECORDINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.ZOOM_LIST_MEETING_SUMMARY_TEMPLATES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.ZOOM_LIST_WEBINAR_REGISTRANTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.ZOOM_SEARCH_COMPANY_CONTACTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.ZOOM_CREATE_A_MEETING]: z.object({}).passthrough(),
  // Google Drive (mutating shapes verified against live tool schemas 2026-06-11)
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_FIND_FILE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_FIND_FOLDER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_LIST_FILES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_GET_FILE_METADATA]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_PARSE_FILE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_MOVE_FILE]: z
    .object({
      file_id: z.string().min(1),
      add_parents: z.string().optional(),
      remove_parents: z.string().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_CREATE_FOLDER]: z
    .object({
      folder_name: z.string().min(1),
      parent_id: z.string().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_COPY_FILE]: z
    .object({
      file_id: z.string().min(1),
      new_title: z.string().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_CREATE_FILE_FROM_TEXT]: z
    .object({
      file_name: z.string().min(1),
      text_content: z.string().min(1),
      mime_type: z.string().optional(),
      parent_id: z.string().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_DELETE_FILE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_EMPTY_TRASH]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_SHARE_FILE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_UPDATE_PERMISSION]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_DELETE_PERMISSION]: z.object({}).passthrough(),
  // Google Docs
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_GET_DOCUMENT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_SEARCH_DOCUMENTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN]: z
    .object({
      title: z.string().min(1),
      markdown_text: z.string().min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_UPDATE_DOCUMENT_MARKDOWN]: z
    .object({
      document_id: z.string().min(1),
      new_markdown_text: z.string().min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_DELETE_CONTENT_RANGE]: z.object({}).passthrough(),
  // Google Sheets
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_GET_SPREADSHEET_INFO]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_GET_SHEET_NAMES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_BATCH_GET]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_SEARCH_SPREADSHEETS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_CREATE_SPREADSHEET]: z
    .object({
      title: z.string().min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_VALUES_APPEND]: z
    .object({
      spreadsheetId: z.string().min(1),
      range: z.string().min(1),
      valueInputOption: z.string().min(1),
      values: z.array(z.array(z.unknown())),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_DELETE_SHEET]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESHEETS_CLEAR_VALUES]: z.object({}).passthrough(),
  // Google Slides
  [COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_GET_PRESENTATION]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_GET_PAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_CREATE_FROM_MARKDOWN]: z
    .object({
      title: z.string().min(1),
      markdown_text: z.string().min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.GOOGLESLIDES_CREATE_PRESENTATION]: z
    .object({
      title: z.string().optional(),
    })
    .passthrough(),
  // Stripe (shapes verified against live tool schemas 2026-06-11)
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CUSTOMERS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_SEARCH_CUSTOMERS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_CUSTOMER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_INVOICES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_SUBSCRIPTIONS]: z.object({}).passthrough(),
  // STRIPE_RETRIEVE_SUBSCRIPTION removed — Composio API rejected slug 2026-07-13
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_CHARGES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_CHARGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_BALANCE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_PRODUCTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_PAYMENT_LINKS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_LIST_REFUNDS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_CUSTOMER]: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      description: z.string().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_UPDATE_CUSTOMER]: z
    .object({
      customer_id: z.string().min(1),
    })
    .passthrough(),
  // auto_advance pinned to false: Salt only ever creates draft invoices.
  // Auto-finalizing drafts would make them customer-visible without the
  // user touching Stripe, which breaks the draft-first trust posture.
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_INVOICE]: z
    .object({
      customer: z.string().min(1),
      auto_advance: z.literal(false).optional(),
      currency: z.string().optional(),
      description: z.string().optional(),
      days_until_due: z.number().int().positive().optional(),
      collection_method: z.string().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_SUBSCRIPTION]: z
    .object({
      customer: z.string().min(1),
      items: z.array(z.record(z.string(), z.unknown())).min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_UPDATE_SUBSCRIPTION]: z
    .object({
      subscription_id: z.string().min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_CANCEL_SUBSCRIPTION]: z
    .object({
      subscription_id: z.string().min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_PRODUCT]: z
    .object({
      name: z.string().min(1),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_PRICE]: z
    .object({
      currency: z.string().min(1),
      product: z.string().optional(),
      unit_amount: z.number().int().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_REFUND]: z
    .object({
      charge: z.string().optional(),
      payment_intent: z.string().optional(),
      amount: z.number().int().positive().optional(),
      reason: z.string().optional(),
    })
    .passthrough(),
  [COMPOSIO_TOOL_SLUGS.STRIPE_DELETE_CUSTOMER]: z.object({}).passthrough(),
  // --- Outlook
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_MESSAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_LIST_MESSAGES]: z.object({}).passthrough(),
  // Current toolkit (verified live 2026-08-06) — the un-prefixed message
  // reads above 404.
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_OUTLOOK_GET_MESSAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_OUTLOOK_LIST_MESSAGES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_EVENT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR_VIEW]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_SEND_EMAIL]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_DRAFT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_CALENDAR_CREATE_EVENT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_FORWARD_MESSAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_GET_CALENDAR_SCHEDULE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_LIST_CALENDARS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_CONTACT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.OUTLOOK_UPDATE_CONTACT]: z.object({}).passthrough(),
  // --- Slack
  [COMPOSIO_TOOL_SLUGS.SLACK_FETCH_CONVERSATION_HISTORY]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_FIND_CHANNELS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_FIND_USERS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_GET_UNREAD_MESSAGES_FROM_USER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_CHAT_POST_MESSAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_ADD_REACTION_TO_AN_ITEM]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_GET_TEAM_INFO]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_INFO]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_LIST]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_MEMBERS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_REPLIES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_SEARCH_MESSAGES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_USERS_INFO]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_CHAT_UPDATE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_CREATE_CHANNEL]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_CONVERSATIONS_JOIN]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_INVITE_TO_CHANNEL]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_SEND_DIRECT_MESSAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_SEND_MESSAGE_WEBHOOK]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.SLACK_UPLOAD_FILE]: z.object({}).passthrough(),
  // --- HubSpot
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_COMPANY_ACTIVITIES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_COMPANY_MEETINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_LIST_DEAL_ACTIVITIES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_GET_PIPELINE_STAGE_AUDIT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_CONTACT_FROM_NL]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_DEAL_FROM_NL]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_MEETING]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_READ_ASSOCIATIONS_BATCH]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_CRM_OBJECT_FROM_NL]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_PRODUCT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_TICKETS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.HUBSPOT_CREATE_OBJECT_ASSOCIATION]: z.object({}).passthrough(),
  // --- QuickBooks
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_COMPANY_INFO]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_BALANCE_SHEET_REPORT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_PROFIT_AND_LOSS_REPORT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_REPORT_CASH_FLOW]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_CHANGED_ENTITIES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_INVOICE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_ESTIMATE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_ACCOUNT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_INVOICE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_PURCHASE_ORDER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_GET_VENDOR]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_FIND_PRODUCTS_AND_SERVICES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_LIST_ACCOUNTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_QUERY_ENTITY]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_CUSTOMER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CREATE_PURCHASE_ORDER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_SEND_INVOICE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_UPDATE_CUSTOMER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_UPDATE_INVOICE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.QUICKBOOKS_CUSTOMER_BALANCE_DETAIL]: z.object({}).passthrough(),
  // --- Calendly
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENT_TYPES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_SCHEDULED_EVENTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_GET_USER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_GET_EVENT_TYPE_AVAILABILITY]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_CANCEL_SCHEDULED_EVENT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_GET_ORGANIZATION]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_ROUTING_FORM_SUBMISSIONS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_CREATE_EVENT_TYPE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_UPDATE_EVENT_TYPE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_UPDATE_EVENT_TYPE_AVAILABILITY]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_POST_INVITEE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_CREATE_WEBHOOKS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_ORGANIZATION_INVITATION]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_GET_CURRENT_USER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CALENDLY_LIST_EVENT_INVITEES]: z.object({}).passthrough(),
  // --- Dropbox
  [COMPOSIO_TOOL_SLUGS.DROPBOX_FILES_SEARCH]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_ACCOUNT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_SPACE_USAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_LIST_FILE_REQUESTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_FOLDER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_COPY_FILE_OR_FOLDER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_SHARED_LINK]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_DELETE_FILE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_SHARED_FOLDER_METADATA]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_TEAM_INFO]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_GET_TEAM_LOG_EVENTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_SHARED_LINK_SIMPLE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_FILE_REQUEST]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_PAPER_DOCUMENT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_TEAM_FOLDER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_CREATE_TEAM_GROUP]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_FILE_MEMBER]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_FOLDER_MEMBER_ACTION]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_TEAM_GROUP_MEMBERS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_ADD_TEAM_MEMBERS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.DROPBOX_LIST_FILES_IN_FOLDER]: z.object({}).passthrough(),
  // --- Notion
  [COMPOSIO_TOOL_SLUGS.NOTION_FETCH_DATABASE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_QUERY_DATABASE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_GET_PAGE_MARKDOWN]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_LIST_USERS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_FETCH_BLOCK_CONTENTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_CREATE_NOTION_PAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_INSERT_ROW_DATABASE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_DELETE_BLOCK]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_LIST_ALL_DATABASES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_LIST_ALL_PAGES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_FETCH_PAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_FETCH_ALL_BLOCK_CONTENTS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_FILTER_PAGE_BY_KEYWORD]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_SEARCH_ENTITY]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_CREATE_DATABASE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_CREATE_COMMENT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_ADD_MULTIPLE_PAGE_CONTENT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_DATABASE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_PAGE]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.NOTION_UPDATE_ROW_IN_DATABASE]: z.object({}).passthrough(),
};

export function parseComposioToolInput<T>(
  toolSlug: string,
  input: T,
): Record<string, unknown> {
  const schema = composioToolInputSchemas[toolSlug];
  if (!schema) {
    throw new Error(`No input schema registered for Composio tool: ${toolSlug}`);
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid Composio tool input for ${toolSlug}: ${parsed.error.message}`);
  }
  return parsed.data as Record<string, unknown>;
}
