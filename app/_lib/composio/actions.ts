import "server-only";

import type { ToolExecuteResponse } from "@composio/core";
import { getWorkspaceConnectorPolicy } from "@/app/_features/connectors/queries";
import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import { getComposioClient } from "./client";
import { logToolExecution, type ToolExecutionSource } from "./execution-log";
import {
  assertComposioToolAllowed,
  isPlayApprovedAction,
  parseComposioToolInput,
  type PlayApprovalContext,
  type ComposioToolPolicy,
} from "./tool-policy";
import { getApprovedToolClassification } from "./classification-store";
import { requireMatchingComposioUserId } from "./require-composio-user";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { formatComposioToolError } from "./composio-errors";
import type {
  GmailSendEmailInput, GmailCreateDraftInput, GmailMessage, GmailLabel,
  CalendarEventInput, CalendarEvent,
  CalBookingInput, CalBooking, CalEventType,
  FirefliesTranscriptInput, FirefliesTranscript, FirefliesMeeting,
} from "./types";

function unwrapToolResult<R>(result: ToolExecuteResponse): R {
  if (result && typeof result === "object" && "data" in result) {
    return result.data as R;
  }
  return result as R;
}

// ── Generic executor ──
export async function executeComposioAction<T, R>(
  toolSlug: string,
  input: T,
  connectionId: string,
  userId: string,
  options?: {
    skipAuthCheck?: boolean;
    humanApproved?: boolean;
    workspaceId?: string;
    /** Background scans / scheduled jobs: only read-class tools may run. */
    unattended?: boolean;
    /** Auth user driving this execution (for the audit log). */
    actorUserId?: string;
    /** Audit log source; defaults to server_action (background when unattended). */
    source?: ToolExecutionSource;
    /**
     * Pre-approved play run: mutating slugs in the play's approved actions
     * execute without a per-action approval card. Callers must pass the
     * enrollment's recorded consent and set actorUserId to the user who
     * approved the play (consent provenance in the audit log).
     */
    play?: PlayApprovalContext;
  },
): Promise<R> {
  if (!options?.skipAuthCheck) {
    await requireMatchingComposioUserId(userId);
  }

  const playApproved = isPlayApprovedAction(toolSlug, options?.play);
  const source: ToolExecutionSource =
    options?.source ??
    (options?.play
      ? "play"
      : options?.unattended
        ? "background"
        : "server_action");

  // Fail-closed classification lookup (connector-platform Phase 2.4):
  // risk data lives in tool_classifications; no approved row → blocked.
  let resolvedPolicy: ComposioToolPolicy | null = null;

  const logOutcome = async (
    status: "success" | "error" | "blocked",
    args?: unknown,
    error?: string,
  ) => {
    const policy = resolvedPolicy;
    if (!options?.workspaceId || !policy) {
      return;
    }
    await logToolExecution({
      workspaceId: options.workspaceId,
      toolSlug,
      risk: policy.risk,
      source,
      status,
      userId: options.actorUserId ?? null,
      // Play runs carry consent from play enablement; actorUserId is the
      // user who approved the play.
      approvedBy:
        options.humanApproved || playApproved ? options.actorUserId ?? null : null,
      args,
      error,
    });
  };

  let validatedInput: Record<string, unknown>;
  try {
    resolvedPolicy = await getApprovedToolClassification(toolSlug);

    const connectorPolicy = options?.workspaceId
      ? await getWorkspaceConnectorPolicy(options.workspaceId)
      : null;

    const policy = assertComposioToolAllowed(toolSlug, {
      policy: resolvedPolicy,
      disabledTools: connectorPolicy?.disabledTools,
      unattended: options?.unattended,
      play: options?.play,
    });

    // Trust ladder: when workspace context is known, mutating tools require
    // the provider to be upgraded to act_with_approval (missing row =
    // read_only). Email mode: sends are blocked while the workspace is in
    // draft mode.
    if (connectorPolicy && policy.risk === "mutating") {
      const provider = getComposioProviderForToolSlug(toolSlug);
      const trust = provider
        ? connectorPolicy.trustByProvider[provider]
        : undefined;
      if (trust !== "act_with_approval") {
        throw new Error(
          `Composio tool ${toolSlug} requires the connector to be set to "Act with approval" in connector settings`,
        );
      }
      if (
        toolSlug === COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL &&
        connectorPolicy.emailMode !== "send"
      ) {
        throw new Error(
          "Email mode is set to draft — Salt creates drafts instead of sending. Switch to Send mode in Gmail connector settings to send email.",
        );
      }
    }

    // Pre-approved play actions carry consent from play enablement; every
    // other mutating execution still needs an explicit per-action approval.
    if (
      policy.requiresHumanConfirmation &&
      !options?.humanApproved &&
      !playApproved
    ) {
      throw new Error(
        `Composio tool ${toolSlug} requires explicit human approval before execution`,
      );
    }

    validatedInput = parseComposioToolInput(toolSlug, input);
  } catch (error) {
    await logOutcome(
      "blocked",
      undefined,
      error instanceof Error ? error.message : "Blocked by policy",
    );
    throw error;
  }

  try {
    const result = await getComposioClient().tools.execute(toolSlug, {
      userId,
      connectedAccountId: connectionId,
      arguments: validatedInput,
      // TODO: Pin toolkit versions per-provider for stability
      dangerouslySkipVersionCheck: true,
    });
    await logOutcome("success", validatedInput);
    return unwrapToolResult<R>(result);
  } catch (error) {
    const message = formatComposioToolError(error, toolSlug);
    console.error("Error executing Composio tool:", toolSlug, error);
    await logOutcome("error", validatedInput, message);
    throw new Error(message, { cause: error instanceof Error ? error : undefined });
  }
}

// ══════════════════════════════════════════════════════════════════════
// GMAIL (Phase 1 — pilot)
// ══════════════════════════════════════════════════════════════════════

export async function sendGmailEmail(
  input: GmailSendEmailInput,
  connectionId: string,
  userId: string,
): Promise<GmailMessage> {
  return executeComposioAction<GmailSendEmailInput, GmailMessage>(
    COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
    input,
    connectionId,
    userId,
    { humanApproved: true },
  );
}

export async function createGmailDraft(
  input: GmailCreateDraftInput,
  connectionId: string,
  userId: string,
): Promise<GmailMessage> {
  return executeComposioAction<GmailCreateDraftInput, GmailMessage>(
    COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT,
    input,
    connectionId,
    userId,
  );
}

export async function listGmailMessages(
  query: {
    query?: string;
    maxResults?: number;
    includePayload?: boolean;
    verbose?: boolean;
  },
  connectionId: string,
  userId: string,
  options?: {
    skipAuthCheck?: boolean;
    workspaceId?: string;
    unattended?: boolean;
  },
): Promise<GmailMessage[]> {
  return executeComposioAction<
    {
      query?: string;
      max_results?: number;
      include_payload?: boolean;
      verbose?: boolean;
    },
    GmailMessage[]
  >(
    COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
    {
      query: query.query,
      max_results: query.maxResults,
      include_payload: query.includePayload ?? false,
      verbose: query.verbose ?? false,
    },
    connectionId,
    userId,
    options,
  );
}

export async function getGmailMessage(
  messageId: string,
  connectionId: string,
  userId: string,
): Promise<GmailMessage> {
  return executeComposioAction<{ message_id: string }, GmailMessage>(
    COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE,
    { message_id: messageId },
    connectionId,
    userId,
  );
}

export async function listGmailLabels(
  connectionId: string,
  userId: string,
): Promise<GmailLabel[]> {
  return executeComposioAction<Record<string, never>, GmailLabel[]>(
    COMPOSIO_TOOL_SLUGS.GMAIL_LIST_LABELS,
    {},
    connectionId,
    userId,
  );
}

// ══════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR (Phase 2)
// ══════════════════════════════════════════════════════════════════════

export async function createCalendarEvent(
  input: CalendarEventInput,
  connectionId: string,
  userId: string,
): Promise<CalendarEvent> {
  return executeComposioAction<CalendarEventInput, CalendarEvent>(
    COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT,
    input,
    connectionId,
    userId,
    { humanApproved: true },
  );
}

export async function listCalendarEvents(
  params: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    orderBy?: "startTime" | "updated";
  },
  connectionId: string,
  userId: string,
): Promise<CalendarEvent[]> {
  return executeComposioAction<typeof params, CalendarEvent[]>(
    COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_LIST_EVENTS,
    params,
    connectionId,
    userId,
  );
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput> & { start_datetime: string },
  connectionId: string,
  userId: string,
): Promise<CalendarEvent> {
  return executeComposioAction<
    { event_id: string } & Partial<CalendarEventInput>,
    CalendarEvent
  >(
    COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT,
    { event_id: eventId, ...input },
    connectionId,
    userId,
    { humanApproved: true },
  );
}

// ══════════════════════════════════════════════════════════════════════
// CAL / CAL.COM (Phase 2)
// ══════════════════════════════════════════════════════════════════════

export async function createCalBooking(
  input: CalBookingInput,
  connectionId: string,
  userId: string,
): Promise<CalBooking> {
  return executeComposioAction<CalBookingInput, CalBooking>(
    COMPOSIO_TOOL_SLUGS.CAL_CREATE_BOOKING,
    input,
    connectionId,
    userId,
    { humanApproved: true },
  );
}

export async function listCalBookings(
  params: { userId?: string; status?: string; limit?: number },
  connectionId: string,
  composioUserId: string,
): Promise<CalBooking[]> {
  return executeComposioAction<typeof params, CalBooking[]>(
    COMPOSIO_TOOL_SLUGS.CAL_LIST_BOOKINGS,
    params,
    connectionId,
    composioUserId,
  );
}

export async function listCalEventTypes(
  connectionId: string,
  userId: string,
): Promise<CalEventType[]> {
  return executeComposioAction<Record<string, never>, CalEventType[]>(
    COMPOSIO_TOOL_SLUGS.CAL_LIST_EVENT_TYPES,
    {},
    connectionId,
    userId,
  );
}

export async function cancelCalBooking(
  bookingId: number,
  reason: string | undefined,
  connectionId: string,
  userId: string,
): Promise<void> {
  return executeComposioAction<{ id: number; reason?: string }, void>(
    COMPOSIO_TOOL_SLUGS.CAL_CANCEL_BOOKING,
    { id: bookingId, reason },
    connectionId,
    userId,
    { humanApproved: true },
  );
}

// ══════════════════════════════════════════════════════════════════════
// FIREFLIES (Phase 2)
// ══════════════════════════════════════════════════════════════════════

export async function listFirefliesMeetings(
  input: FirefliesTranscriptInput,
  connectionId: string,
  userId: string,
): Promise<FirefliesMeeting[]> {
  return executeComposioAction<FirefliesTranscriptInput, FirefliesMeeting[]>(
    COMPOSIO_TOOL_SLUGS.FIREFLIES_LIST_MEETINGS,
    input,
    connectionId,
    userId,
  );
}

export async function getFirefliesTranscript(
  meetingId: string,
  connectionId: string,
  userId: string,
): Promise<FirefliesTranscript> {
  return executeComposioAction<{ meetingId: string }, FirefliesTranscript>(
    COMPOSIO_TOOL_SLUGS.FIREFLIES_GET_TRANSCRIPT,
    { meetingId },
    connectionId,
    userId,
  );
}

export async function searchFirefliesMeetings(
  query: string,
  connectionId: string,
  userId: string,
): Promise<FirefliesMeeting[]> {
  return executeComposioAction<{ query: string }, FirefliesMeeting[]>(
    COMPOSIO_TOOL_SLUGS.FIREFLIES_SEARCH_MEETINGS,
    { query },
    connectionId,
    userId,
  );
}
