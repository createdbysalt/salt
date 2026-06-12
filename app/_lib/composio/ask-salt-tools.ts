import "server-only";

import type { ToolSet } from "ai";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { logToolExecution } from "./execution-log";
import {
  getComposioToolPolicy,
  listAgentExposableToolSlugs,
  parseComposioToolInput,
  type ComposioToolPolicy,
} from "./tool-policy";

const ASK_SALT_TOOLKIT_ALLOWLIST = [
  "gmail",
  "googlecalendar",
  "googledrive",
  "googledocs",
  "googlesheets",
  "googleslides",
  "stripe",
] as const;

export const ASK_SALT_COMPOSIO_TOOLKITS: string[] = [...ASK_SALT_TOOLKIT_ALLOWLIST];

/** Toolkit key → tool slug prefix for the per-app connectors Ask Salt supports. */
const TOOLKIT_SLUG_PREFIXES: Record<string, string> = {
  gmail: "GMAIL_",
  googlecalendar: "GOOGLECALENDAR_",
  googledrive: "GOOGLEDRIVE_",
  googledocs: "GOOGLEDOCS_",
  googlesheets: "GOOGLESHEETS_",
  googleslides: "GOOGLESLIDES_",
  stripe: "STRIPE_",
};

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
}

function providerForSlug(slug: string): string | null {
  for (const [toolkit, prefix] of Object.entries(TOOLKIT_SLUG_PREFIXES)) {
    if (slug.startsWith(prefix)) {
      return toolkit;
    }
  }
  return null;
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

  const log = (
    status: "success" | "error" | "blocked",
    args?: unknown,
    error?: string,
  ) => {
    if (!options.workspaceId) {
      return;
    }
    void logToolExecution({
      workspaceId: options.workspaceId,
      toolSlug: slug,
      risk: policy.risk,
      source: "ask_salt",
      status,
      userId: options.userId ?? null,
      // Mutating tools only execute after the user approves them in-thread.
      approvedBy: policy.requiresHumanConfirmation ? options.userId ?? null : null,
      args,
      error,
    });
  };

  const enforcedExecute: typeof execute = async (input, executionOptions) => {
    let validatedInput: Record<string, unknown>;
    try {
      validatedInput = parseComposioToolInput(slug, input);
    } catch (error) {
      log("blocked", undefined, error instanceof Error ? error.message : "Invalid input");
      throw error;
    }

    try {
      const result = await execute(validatedInput, executionOptions);
      log("success", validatedInput);
      return result;
    } catch (error) {
      log(
        "error",
        validatedInput,
        error instanceof Error ? error.message : "Execution failed",
      );
      throw error;
    }
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

    if (policy.requiresHumanConfirmation) {
      wrapped[name] = {
        ...enforcedTool,
        needsApproval: true,
      };
    } else {
      wrapped[name] = enforcedTool;
    }
  }

  return wrapped;
}
