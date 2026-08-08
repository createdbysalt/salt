import "server-only";

import type { ToolExecuteResponse } from "@composio/core";
import { getWorkspaceConnectorPolicy } from "@/app/_features/connectors/queries";
import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import { getComposioClient } from "./client";
import { logToolExecution, type ToolExecutionSource } from "./execution-log";
import {
  assertComposioToolAllowed,
  composioToolInputSchemas,
  isPlayApprovedAction,
  parseComposioToolInput,
  type PlayApprovalContext,
  type ComposioToolPolicy,
} from "./tool-policy";
import { getSyncedToolSchema } from "./input-schema-store";
import { validateArgsAgainstJsonSchema } from "./json-schema-validate";
import { checkRateLimit, createRateLimitKey } from "@/app/_lib/rate-limit";
import { canSpend, isBlocked } from "@/app/_lib/usage/can-spend";
import { COMPOSIO_ACTION_MICROS } from "@/app/_lib/usage/play-cost";
import { recordComposioActionCall } from "@/app/_lib/usage/record-composio-usage";
import { getApprovedToolClassification } from "./classification-store";
import { requireMatchingComposioUserId } from "./require-composio-user";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { formatComposioToolError } from "./composio-errors";
import {
  isSendEmailTool,
  getProviderForSendTool,
  getEmailProviderCapability,
} from "./capability-config";
import type { GmailMessage } from "./types";

function unwrapToolResult<R>(result: ToolExecuteResponse): R {
  if (result && typeof result === "object" && "data" in result) {
    return result.data as R;
  }
  return result as R;
}

/**
 * Blast-radius limits (5.5.5): per-workspace, per-risk-class execution caps
 * at the gate. In-memory sliding windows (per instance — a burst brake, not
 * an exact quota). Mutating executions are the tight bound; reads get
 * headroom for scans/backfills.
 */
const GATE_RATE_LIMITS = {
  mutating: { maxRequests: 30, windowSeconds: 3600 },
  read: { maxRequests: 600, windowSeconds: 3600 },
} as const;

function assertWithinGateRateLimit(
  workspaceId: string | undefined,
  risk: ComposioToolPolicy["risk"]
): void {
  if (!workspaceId) return;
  const cls = risk === "read" ? "read" : "mutating";
  const result = checkRateLimit(
    createRateLimitKey("composio-gate", workspaceId, cls),
    GATE_RATE_LIMITS[cls]
  );
  if (!result.allowed) {
    throw new Error(
      `Connector ${cls} rate limit reached for this workspace (${GATE_RATE_LIMITS[cls].maxRequests}/hour) — try again later`
    );
  }
}

/**
 * Boundary validation (5.5.2): hand-written Zod schemas stay authoritative
 * for the pinned tool set; long-tail slugs validate structurally against the
 * synced catalog schema. No schema anywhere = cannot execute (fail closed).
 */
async function validateComposioToolInput(
  toolSlug: string,
  input: unknown
): Promise<Record<string, unknown>> {
  if (composioToolInputSchemas[toolSlug]) {
    return parseComposioToolInput(toolSlug, input);
  }
  const synced = await getSyncedToolSchema(toolSlug);
  if (!synced) {
    throw new Error(`No input schema registered for Composio tool: ${toolSlug}`);
  }
  return validateArgsAgainstJsonSchema(input, synced.inputSchema, toolSlug);
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
  }
): Promise<R> {
  if (!options?.skipAuthCheck) {
    // Composio v3 entity id is workspace-scoped (composio.create(workspaceId)),
    // but session auth must match the human actor — not the workspace uuid.
    const authSubject = options?.actorUserId ?? userId;
    await requireMatchingComposioUserId(authSubject);
  }

  if (!options?.workspaceId) {
    // Without workspace context this execution is unmetered, un-budgeted, and
    // un-audited (canSpend, recordComposioActionCall, and logToolExecution all
    // need it). Every live call path threads workspaceId; a hit here means a
    // new caller regressed the metering guarantee — fix the caller.
    console.error(
      "[composio-tool-exec] executing %s WITHOUT workspaceId — spend will not be metered or audited",
      toolSlug
    );
  }

  const playApproved = isPlayApprovedAction(toolSlug, options?.play);
  const source: ToolExecutionSource =
    options?.source ??
    (options?.play ? "play" : options?.unattended ? "background" : "server_action");

  // Fail-closed classification lookup (connector-platform Phase 2.4):
  // risk data lives in tool_classifications; no approved row → blocked.
  let resolvedPolicy: ComposioToolPolicy | null = null;

  const logOutcome = async (
    status: "success" | "error" | "blocked",
    args?: unknown,
    error?: string
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
      approvedBy: options.humanApproved || playApproved ? (options.actorUserId ?? null) : null,
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
      unattended: options?.unattended,
      play: options?.play,
    });

    // Trust ladder: when workspace context is known, mutating tools require
    // the provider to be upgraded to act_with_approval (missing row =
    // read_only). Email mode: sends are blocked while the workspace is in
    // draft mode.
    if (connectorPolicy && policy.risk === "mutating") {
      const provider = getComposioProviderForToolSlug(toolSlug);
      const trust = provider ? connectorPolicy.trustByProvider[provider] : undefined;
      if (trust !== "act_with_approval" && trust !== "trust") {
        throw new Error(
          `Composio tool ${toolSlug} requires the connector to be set to "Ask" or "Trust" in Settings → Plays`
        );
      }
      // Check email mode per provider (generic for all email providers)
      if (isSendEmailTool(toolSlug)) {
        const emailProvider = getProviderForSendTool(toolSlug);
        if (emailProvider && connectorPolicy.emailModeByProvider?.[emailProvider] !== "send") {
          const cap = getEmailProviderCapability(emailProvider);
          const label = cap?.label ?? emailProvider;
          throw new Error(
            `${label} is in draft mode — Salt creates drafts instead of sending. Switch to Send mode in ${label} connector settings to send email.`
          );
        }
      }
    }

    // Pre-approved play actions carry consent from play enablement; every
    // other mutating execution still needs an explicit per-action approval.
    if (policy.requiresHumanConfirmation && !options?.humanApproved && !playApproved) {
      throw new Error(
        `Composio tool ${toolSlug} requires explicit human approval before execution`
      );
    }

    assertWithinGateRateLimit(options?.workspaceId, policy.risk);

    // Spend admission (pricing G7). Sits after the safety gates deliberately:
    // a tool the workspace is not allowed to run at all should be refused for
    // that reason, not for a budget reason that would send the user to Billing
    // to fix a permissions problem.
    //
    // Skipped without workspace context, because there is no budget to check
    // against. Those call sites are already the ones missing an audit log
    // (`logOutcome` returns early for the same reason) and should be given
    // workspace context rather than have a guess made on their behalf.
    if (options?.workspaceId) {
      const decision = await canSpend({
        workspaceId: options.workspaceId,
        kind: "composio_action",
        // A pre-approved play is work the user already signed off on and is
        // waiting for; an unattended scan is nobody's foreground request.
        origin: options.play ? "committed" : options.unattended ? "background" : "user",
        estimateMicros: COMPOSIO_ACTION_MICROS,
      });

      if (isBlocked(decision) && decision.userMessage) {
        throw new Error(decision.userMessage);
      }
    }

    validatedInput = await validateComposioToolInput(toolSlug, input);
  } catch (error) {
    await logOutcome(
      "blocked",
      undefined,
      error instanceof Error ? error.message : "Blocked by policy"
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
    // Cost recording at the spend primitive (billing-metering doctrine):
    // success only — failed calls are vendor-free. Play runs are excluded;
    // their Composio COGS is already carried by the run's play_executed row.
    if (options?.workspaceId && !options?.play) {
      await recordComposioActionCall({
        workspaceId: options.workspaceId,
        toolSlug,
      });
    }
    await logOutcome("success", validatedInput);
    return unwrapToolResult<R>(result);
  } catch (error) {
    const message = formatComposioToolError(error, toolSlug);

    // Enhanced diagnostics for connection issues
    const errorObj = error as {
      response?: { status?: number; data?: unknown };
      code?: number;
      slug?: string;
    };
    const isExpired =
      message.includes("EXPIRED") || errorObj.slug === "ActionExecute_ConnectedAccountExpired";
    const isAuthError = errorObj.response?.status === 401 || errorObj.response?.status === 403;

    console.error("[composio-tool-exec] Tool execution failed:", {
      toolSlug,
      connectionId,
      workspaceId: options?.workspaceId,
      errorMessage: message,
      isExpired,
      isAuthError,
      httpStatus: errorObj.response?.status,
      composioCode: errorObj.code,
      composioSlug: errorObj.slug,
      timestamp: new Date().toISOString(),
    });

    if (isExpired) {
      console.error("[composio-tool-exec] CONNECTION EXPIRED - user needs to re-authenticate", {
        connectionId,
        toolSlug,
        workspaceId: options?.workspaceId,
        suggestedAction: "Disconnect and reconnect the provider at /connections",
      });
    }

    await logOutcome("error", validatedInput, message);
    throw new Error(message, { cause: error instanceof Error ? error : undefined });
  }
}

// ══════════════════════════════════════════════════════════════════════
// GMAIL — live wrappers only. Email send/draft, calendar mutation, and
// Fireflies wrappers were deleted (Sources plan 1.5, zero call sites):
// Ask Salt and plays execute those slugs through the gate directly.
// ══════════════════════════════════════════════════════════════════════

export interface GmailMessagesPage {
  /** Raw metadata rows from GMAIL_FETCH_EMAILS — adapter-normalized downstream. */
  messages: unknown[];
  /** Pass back as pageToken to fetch the next page; null on the last page. */
  nextPageToken: string | null;
}

/**
 * One page of Gmail message metadata via GMAIL_FETCH_EMAILS.
 * Rows are returned raw (not GmailMessage-shaped) so the capture adapter is
 * the single place that interprets provider payloads. Max 500 per page.
 */
export async function fetchGmailMessagesPage(
  query: {
    query?: string;
    maxResults?: number;
    pageToken?: string;
    /**
     * Sources plan 3.4: fetch full message bodies with the page so backfill
     * can analyze inline on the transient body. Same Composio call, same
     * cost — the payload rides along with the page fetch.
     */
    includePayload?: boolean;
  },
  connectionId: string,
  userId: string,
  options?: {
    skipAuthCheck?: boolean;
    workspaceId?: string;
    unattended?: boolean;
  }
): Promise<GmailMessagesPage> {
  const raw = await executeComposioAction<
    {
      query?: string;
      max_results?: number;
      page_token?: string;
      include_payload?: boolean;
      verbose?: boolean;
    },
    unknown
  >(
    COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
    {
      query: query.query,
      max_results: query.maxResults,
      page_token: query.pageToken,
      include_payload: query.includePayload ?? false,
      verbose: false,
    },
    connectionId,
    userId,
    options
  );

  if (Array.isArray(raw)) {
    return { messages: raw, nextPageToken: null };
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const messages =
      [record.messages, record.data, record.emails, record.results].find(Array.isArray) ?? [];
    const token = record.nextPageToken;
    return {
      messages: messages as unknown[],
      nextPageToken: typeof token === "string" && token.length > 0 ? token : null,
    };
  }
  return { messages: [], nextPageToken: null };
}

export async function getGmailMessage(
  messageId: string,
  connectionId: string,
  userId: string,
  options?: {
    skipAuthCheck?: boolean;
    workspaceId?: string;
    unattended?: boolean;
  }
): Promise<GmailMessage> {
  return executeComposioAction<{ message_id: string }, GmailMessage>(
    COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE,
    { message_id: messageId },
    connectionId,
    userId,
    options
  );
}

// CAL.COM — handled via connector-backfills.ts + cal-booking-processor.ts
// No action wrappers needed; backfill calls executeComposioAction directly.
