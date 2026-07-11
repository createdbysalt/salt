import "server-only";

import type { ToolSet } from "ai";
import { compactToolResultForAskSalt } from "@/app/_features/ask-salt/context-budget";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { executeComposioAction } from "./actions";
import {
  askSaltManifestSlugPrefixes,
  askSaltManifestToolkits,
} from "./connector-manifest";
import {
  getComposioToolPolicy,
  listAgentExposableToolSlugs,
  type ComposioToolPolicy,
} from "./tool-policy";

/** Per-app connectors Ask Salt supports — derived from the connector manifest. */
export const ASK_SALT_COMPOSIO_TOOLKITS: string[] = askSaltManifestToolkits();

/** Toolkit key → tool slug prefix, derived from the connector manifest. */
const TOOLKIT_SLUG_PREFIXES: Record<string, string> = askSaltManifestSlugPrefixes();

/**
 * Exact tool slugs Ask Salt preloads for the given toolkits.
 * Without an explicit preload, Composio defaults to every tool in the
 * toolkits (plus router meta-tools) — keep the surface deterministic.
 */
export function askSaltPreloadSlugsForToolkits(toolkits: readonly string[]): string[] {
  const prefixes = toolkits
    .map((toolkit) => TOOLKIT_SLUG_PREFIXES[toolkit])
    .filter((prefix): prefix is string => Boolean(prefix));
  return listAgentExposableToolSlugs().filter((slug) =>
    prefixes.some((prefix) => slug.startsWith(prefix)),
  );
}

export const ASK_SALT_PRELOAD_TOOL_SLUGS: string[] = askSaltPreloadSlugsForToolkits(
  ASK_SALT_COMPOSIO_TOOLKITS,
);

export type AskSaltTrustLevel = "read_only" | "act_with_approval";
export type AskSaltEmailMode = "draft" | "send";

export interface AskSaltToolPolicyOptions {
  /** Workspace-level disabled tool slugs (connector settings toggles). */
  disabledTools?: readonly string[];
  /**
   * Trust ladder per provider (gmail, googlecalendar). When provided, mutating
   * tools for providers not at act_with_approval are never registered.
   * Missing provider = read_only.
   */
  trustByProvider?: Record<string, AskSaltTrustLevel>;
  /** Gmail email mode. In draft mode, GMAIL_SEND_EMAIL is never registered. */
  emailMode?: AskSaltEmailMode;
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
}

function providerForSlug(slug: string): string | null {
  for (const [toolkit, prefix] of Object.entries(TOOLKIT_SLUG_PREFIXES)) {
    if (slug.startsWith(prefix)) {
      return toolkit;
    }
  }
  return null;
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
 * Registration-time policy: should this slug be offered to the agent at all?
 * Used for both the session preload list and the wrapped ToolSet so excluded
 * tools never even reach the model.
 */
export function isAskSaltSlugAllowed(
  slug: string,
  options: AskSaltToolPolicyOptions,
): boolean {
  const policy = getComposioToolPolicy(slug);
  if (!policy || policy.risk === "destructive") {
    return false;
  }

  if (options.disabledTools?.includes(slug)) {
    return false;
  }

  if (policy.risk === "mutating" && options.trustByProvider) {
    const provider = providerForSlug(slug);
    const trust = provider ? options.trustByProvider[provider] : undefined;
    if (trust !== "act_with_approval") {
      return false;
    }
  }

  if (
    slug === COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL &&
    options.emailMode !== undefined &&
    options.emailMode !== "send"
  ) {
    return false;
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
    return compactToolResultForAskSalt(result);
  };

  return { ...tool, execute: enforcedExecute };
}

/**
 * Wrap Composio AI SDK tools with Salt policy:
 * - only allowlisted tool slugs pass through (router meta-tools and unknown
 *   toolkit tools are dropped)
 * - destructive tools are never registered, regardless of approval
 * - workspace-disabled tools are never registered
 * - trust ladder: mutating tools only register at act_with_approval trust
 * - email mode: GMAIL_SEND_EMAIL only registers in send mode
 * - tool arguments are validated against Salt's Zod schemas before execution
 * - every execution is recorded in the workspace audit log
 * - mutating tools require human approval (AI SDK needsApproval), except
 *   draft creation, which never leaves the user's own mailbox
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
    const policy = getComposioToolPolicy(name);
    if (!policy) {
      continue;
    }

    const enforcedTool = withPolicyEnforcedExecute(name, policy, tool, options);

    const entry =
      policy.requiresHumanConfirmation
        ? { ...enforcedTool, needsApproval: true as const }
        : enforcedTool;
    wrapped[name] = entry;

    for (const alias of composioToolNameAliases(name)) {
      if (!(alias in wrapped)) {
        wrapped[alias] = entry;
      }
    }
  }

  return wrapped;
}
