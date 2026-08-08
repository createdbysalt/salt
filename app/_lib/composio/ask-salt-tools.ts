import "server-only";

import type { ToolSet } from "ai";
import { compactToolResultForAskSalt } from "@/app/_features/ask-salt/context-budget";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { executeComposioAction } from "./actions";
import { isSendEmailTool, getProviderForSendTool } from "./capability-config";
import {
  getComposioToolPolicy,
  type ComposioToolPolicy,
} from "./tool-policy";
import { classifyToolByHeuristic } from "./tool-classification-heuristics";
import {
  createPlayRecord,
  classifyStakes,
  type SourceContext,
} from "@/app/_features/plays/lib/play-record";
import {
  curatedActivityAction,
  pastTenseAction,
  activityDetailText,
} from "@/app/_features/connectors/utils/activity-format";
import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import type { OutcomeExpected } from "@/app/_lib/learning/outcomes";

/**
 * Tool slug → toolkit, via the shared prefix map in connector-capabilities.
 * Composio names every tool TOOLKIT_ACTION, so prefix matching needs no
 * per-connector registry — any toolkit's tools resolve, which is what lets
 * newly enabled connectors get heuristic policy classification immediately.
 */
function providerForSlug(slug: string): string | null {
  return getComposioProviderForToolSlug(slug);
}

export type AskSaltTrustLevel = "read_only" | "act_with_approval" | "trust";
export type AskSaltEmailMode = "draft" | "send";

export interface AskSaltToolPolicyOptions {
  /**
   * Trust ladder per provider (gmail, googlecalendar). When provided, mutating
   * tools for providers not at act_with_approval are never registered.
   * Missing provider = read_only.
   */
  trustByProvider?: Record<string, AskSaltTrustLevel>;
  /** Email mode per provider (gmail, outlook). In draft mode, send tools are blocked. */
  emailModeByProvider?: Record<string, AskSaltEmailMode>;
}

export interface AskSaltToolWrapOptions extends AskSaltToolPolicyOptions {
  /** Workspace for the execution audit log; logging is skipped when absent. */
  workspaceId?: string;
  /** Auth user chatting with Ask Salt (audit log actor + approver). */
  userId?: string;
  /**
   * Composio connected-account id per toolkit (5.5.1 single-gate invariant):
   * execution routes through executeComposioAction, which needs the account.
   */
  connectionIdByToolkit?: Record<string, string>;
  /** Chat context for play attribution (LEARN → ACT → GROW). */
  chatContext?: {
    chatId: string;
    messageId?: string;
  };
}

/** Lowercase aliases models often invent (e.g. googledocs_get_document_by_id). */
export function composioToolNameAliases(canonicalSlug: string): string[] {
  const lower = canonicalSlug.toLowerCase();
  return lower !== canonicalSlug ? [lower] : [];
}

/**
 * Case-insensitive lookup for repairToolCall / alias resolution.
 * Returns the registered canonical slug when the model uses the wrong casing.
 */
export function resolveComposioToolName(
  toolName: string,
  tools: ToolSet,
): string | null {
  if (toolName in tools) return toolName;
  const lower = toolName.toLowerCase();
  return (
    Object.keys(tools).find((key) => key.toLowerCase() === lower) ?? null
  );
}

/**
 * Get policy for a tool slug, with heuristic fallback for unclassified tools.
 * This enables new connectors to work immediately via pattern matching
 * (QUICKBOOKS_GET_* → read, QUICKBOOKS_CREATE_* → mutating, etc.)
 */
function getPolicyWithHeuristicFallback(slug: string): ComposioToolPolicy | null {
  const dbPolicy = getComposioToolPolicy(slug);
  if (dbPolicy) return dbPolicy;

  // Heuristic fallback only for known Ask Salt toolkits — router meta-tools
  // (COMPOSIO_*) and other unknown prefixes stay dropped.
  if (!providerForSlug(slug)) {
    return null;
  }

  const heuristic = classifyToolByHeuristic(slug);
  return {
    slug,
    risk: heuristic.risk,
    requiresHumanConfirmation: heuristic.requiresHumanConfirmation,
  };
}

/**
 * Registration-time policy: should this slug be offered to the agent at all?
 * Used for both the session preload list and the wrapped ToolSet so excluded
 * tools never even reach the model.
 */
export function isAskSaltSlugAllowed(
  slug: string,
  options: AskSaltToolPolicyOptions,
): boolean {
  const policy = getPolicyWithHeuristicFallback(slug);
  if (!policy || policy.risk === "destructive") {
    return false;
  }

  if (policy.risk === "mutating" && options.trustByProvider) {
    const provider = providerForSlug(slug);
    const trust = provider ? options.trustByProvider[provider] : undefined;
    // Allow mutating tools in "act_with_approval" or "trust" mode
    if (trust !== "act_with_approval" && trust !== "trust") {
      return false;
    }
  }

  // Block send tools when provider is in draft mode
  if (options.emailModeByProvider && isSendEmailTool(slug)) {
    const provider = getProviderForSendTool(slug);
    if (provider && options.emailModeByProvider[provider] !== "send") {
      return false;
    }
  }

  return true;
}

function withPolicyEnforcedExecute(
  slug: string,
  policy: ComposioToolPolicy,
  tool: ToolSet[string],
  options: AskSaltToolWrapOptions,
): ToolSet[string] {
  const execute = tool.execute;
  if (typeof execute !== "function") {
    return tool;
  }

  // Single-gate invariant (5.5.1): the Composio session provides tool
  // SCHEMAS only; execution routes through executeComposioAction — the same
  // fail-closed, DB-classified, audited gate plays and background jobs use.
  const enforcedExecute: typeof execute = async (input) => {
    const workspaceId = options.workspaceId;
    if (!workspaceId) {
      throw new Error(`Composio tool ${slug} requires workspace context to execute`);
    }
    if (!options.userId) {
      throw new Error(`Composio tool ${slug} requires an authenticated user to execute`);
    }
    const toolkit = providerForSlug(slug);
    const connectionId = toolkit
      ? options.connectionIdByToolkit?.[toolkit]
      : undefined;
    if (!connectionId) {
      throw new Error(`No active connection found for Composio tool ${slug}`);
    }

    const result = await executeComposioAction<unknown, unknown>(
      slug,
      input,
      connectionId,
      workspaceId,
      {
        workspaceId,
        actorUserId: options.userId,
        source: "ask_salt",
        // Mutating tools carry needsApproval — by the time execute runs, the
        // user approved the call in-thread.
        humanApproved: policy.requiresHumanConfirmation ? true : undefined,
      },
    );

    // Create play record for mutating actions (LEARN → ACT → GROW attribution)
    if (policy.risk === "mutating") {
      const stakes = classifyStakes(slug);
      const sourceContext: SourceContext = {
        source: "ask_salt",
        chat_id: options.chatContext?.chatId,
        message_id: options.chatContext?.messageId,
        user_approved_at: new Date().toISOString(),
      };

      // Set outcome expectations based on action type
      const { outcomeExpected, outcomeWindowHours } = getOutcomeExpectation(slug);

      try {
        await createPlayRecord({
          workspaceId,
          title: formatToolTitle(slug, input as Record<string, unknown>),
          preview: formatToolPreview(slug, input as Record<string, unknown>),
          channel: toolkitToChannel(toolkit),
          confidence: 95, // User explicitly approved in chat
          stakes,
          sourceContext,
          state: "ran",
          outcomeExpected,
          outcomeWindowHours,
          useBudgetRouting: false, // User-approved actions bypass budget
          // Pricing §1: a standalone external action counts as one play. The
          // tool ran above, so the record must carry it or the play meters as
          // non-billable.
          executedToolSlugs: [slug],
        });
      } catch (error) {
        // Log but don't fail the tool execution
        console.error("Failed to create play record for Ask Salt action:", error);
      }
    }

    return compactToolResultForAskSalt(result);
  };

  return { ...tool, execute: enforcedExecute };
}

function toolkitToChannel(toolkit: string | null): string {
  switch (toolkit) {
    case "gmail":
      return "Gmail";
    case "googlecalendar":
      return "Calendar";
    case "slack":
      return "Slack";
    case "stripe":
      return "Stripe";
    default:
      return "Memory";
  }
}

function formatToolTitle(slug: string, input: Record<string, unknown>): string {
  if (slug === COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL) {
    return `Sent email to ${input.recipient_email || "recipient"}`;
  }
  if (slug === COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT) {
    return `Created email draft for ${input.recipient_email || "recipient"}`;
  }
  if (slug === COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT) {
    return `Created calendar event: ${input.title || "Meeting"}`;
  }
  if (slug === COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_UPDATE_EVENT) {
    return "Updated calendar event";
  }
  if (slug === COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_CUSTOMER) {
    const who =
      typeof input.name === "string" && input.name.trim()
        ? input.name.trim()
        : typeof input.email === "string" && input.email.trim()
          ? input.email.trim()
          : null;
    return who ? `Added Stripe customer: ${who}` : "Added a Stripe customer";
  }
  // Default: curated plain-language copy ("Added a Stripe customer"), then a
  // past-tensed, provider-stripped slug — never the raw slug with spaces.
  const curated = curatedActivityAction(slug);
  if (curated) return curated;
  const provider = getComposioProviderForToolSlug(slug);
  const words = slug.toLowerCase().split("_").filter(Boolean);
  if (provider && words[0] === provider) {
    const action = pastTenseAction(words.slice(1).join(" "));
    return `${action} in ${provider.charAt(0).toUpperCase()}${provider.slice(1)}`;
  }
  return pastTenseAction(words.join(" "));
}

function formatToolPreview(slug: string, input: Record<string, unknown>): string {
  if (slug === COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL || slug === COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT) {
    return (input.subject as string) || "";
  }
  if (slug === COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT) {
    return `${input.start_datetime || ""} - ${input.end_datetime || ""}`;
  }
  // Default: surface the args a person cares about (a name, recipient, amount),
  // hiding API plumbing like calendarId or pageToken.
  return activityDetailText(input) ?? "";
}

function getOutcomeExpectation(slug: string): {
  outcomeExpected: OutcomeExpected | undefined;
  outcomeWindowHours: number | undefined;
} {
  // Email sends expect a reply
  if (slug === COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL) {
    return { outcomeExpected: "reply", outcomeWindowHours: 72 };
  }
  // Calendar event creation expects confirmation/attendance
  if (slug === COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT) {
    return { outcomeExpected: "confirmation", outcomeWindowHours: 24 };
  }
  // Invoice creation expects payment
  if (slug === COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_INVOICE) {
    return { outcomeExpected: "payment", outcomeWindowHours: 168 };
  }
  // Drafts don't expect outcomes (user hasn't sent yet)
  if (slug === COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT) {
    return { outcomeExpected: undefined, outcomeWindowHours: undefined };
  }
  // Default: no expected outcome
  return { outcomeExpected: undefined, outcomeWindowHours: undefined };
}

/**
 * Wrap Composio AI SDK tools with Salt policy:
 * - only allowlisted tool slugs pass through (router meta-tools and unknown
 *   toolkit tools are dropped)
 * - destructive tools are never registered, regardless of approval
 * - workspace-disabled tools are never registered
 * - trust ladder: mutating tools only register at act_with_approval or trust
 * - email mode: GMAIL_SEND_EMAIL only registers in send mode
 * - tool arguments are validated against Salt's Zod schemas before execution
 * - every execution is recorded in the workspace audit log
 * - in "ask" mode: all mutating tools require human approval
 * - in "trust" mode: only tools with requires_human_confirmation=true need approval
 * - draft creation never requires approval (never leaves user's mailbox)
 */
export function wrapComposioToolsForAskSalt(
  tools: ToolSet,
  options: AskSaltToolWrapOptions = {},
): ToolSet {
  const wrapped: ToolSet = {};

  for (const [name, tool] of Object.entries(tools)) {
    if (!isAskSaltSlugAllowed(name, options)) {
      continue;
    }
    const policy = getPolicyWithHeuristicFallback(name);
    if (!policy) {
      continue;
    }

    const enforcedTool = withPolicyEnforcedExecute(name, policy, tool, options);

    const provider = providerForSlug(name);
    const trustLevel = provider
      ? (options.trustByProvider?.[provider] ?? "read_only")
      : "read_only";

    // Draft creation never needs approval - it only saves to user's drafts folder
    const isDraftTool = name === COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT ||
                        name === COMPOSIO_TOOL_SLUGS.OUTLOOK_CREATE_DRAFT;

    // Ensure tool has 'parameters' (AI SDK expects it, Composio uses 'inputSchema')
    const toolAny = enforcedTool as Record<string, unknown>;
    const toolWithParams = toolAny.parameters
      ? enforcedTool
      : { ...enforcedTool, parameters: toolAny.inputSchema };

    const entry =
      trustLevel === "act_with_approval" && policy.risk === "mutating" && !isDraftTool
        ? { ...toolWithParams, needsApproval: true as const }
        : trustLevel === "trust" && policy.requiresHumanConfirmation
          ? { ...toolWithParams, needsApproval: true as const }
          : toolWithParams;
    wrapped[name] = entry;

    for (const alias of composioToolNameAliases(name)) {
      if (!(alias in wrapped)) {
        wrapped[alias] = entry;
      }
    }
  }

  return wrapped;
}
