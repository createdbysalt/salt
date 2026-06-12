import "server-only";

import { z } from "zod";
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
  return TOOL_POLICIES[toolSlug] ?? null;
}

/** Tool slugs Salt's agent may ever see (everything policy-known except destructive). */
export function listAgentExposableToolSlugs(): string[] {
  return Object.values(TOOL_POLICIES)
    .filter((policy) => policy.risk !== "destructive")
    .map((policy) => policy.slug);
}

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
}

export function assertComposioToolAllowed(
  toolSlug: string,
  options?: ComposioToolAllowOptions,
): ComposioToolPolicy {
  const policy = getComposioToolPolicy(toolSlug);
  if (!policy) {
    throw new Error(`Composio tool not allowlisted: ${toolSlug}`);
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
  [COMPOSIO_TOOL_SLUGS.CAL_CANCEL_BOOKING]: z.object({
    id: z.number().int().positive(),
    reason: z.string().optional(),
  }),
  [COMPOSIO_TOOL_SLUGS.CAL_CREATE_BOOKING]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_BOOKINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT]: z.object({}).passthrough(),
  [COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_MEETINGS]: z.object({}).passthrough(),
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
  [COMPOSIO_TOOL_SLUGS.STRIPE_RETRIEVE_SUBSCRIPTION]: z.object({}).passthrough(),
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
