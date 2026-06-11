import "server-only";

import type { ToolSet } from "ai";
import { logToolExecution } from "./execution-log";
import {
  getComposioToolPolicy,
  listAgentExposableToolSlugs,
  parseComposioToolInput,
  type ComposioToolPolicy,
} from "./tool-policy";

const ASK_SALT_TOOLKIT_ALLOWLIST = ["gmail", "googlecalendar"] as const;

export const ASK_SALT_COMPOSIO_TOOLKITS: string[] = [...ASK_SALT_TOOLKIT_ALLOWLIST];

const ASK_SALT_TOOL_SLUG_PREFIXES = ["GMAIL_", "GOOGLECALENDAR_"] as const;

/**
 * Exact tool slugs Ask Salt preloads into its Tool Router session.
 * Without an explicit preload, Composio defaults to every tool in the
 * toolkits (plus router meta-tools) — keep the surface deterministic.
 */
export const ASK_SALT_PRELOAD_TOOL_SLUGS: string[] = listAgentExposableToolSlugs().filter(
  (slug) => ASK_SALT_TOOL_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix)),
);

export interface AskSaltToolWrapOptions {
  /** Workspace-level disabled tool slugs (connector settings toggles). */
  disabledTools?: readonly string[];
  /** Workspace for the execution audit log; logging is skipped when absent. */
  workspaceId?: string;
  /** Auth user chatting with Ask Salt (audit log actor + approver). */
  userId?: string;
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
 * - tool arguments are validated against Salt's Zod schemas before execution
 * - every execution is recorded in the workspace audit log
 * - mutating tools require human approval (AI SDK needsApproval)
 */
export function wrapComposioToolsForAskSalt(
  tools: ToolSet,
  options: AskSaltToolWrapOptions = {},
): ToolSet {
  const disabled = new Set(options.disabledTools ?? []);
  const wrapped: ToolSet = {};

  for (const [name, tool] of Object.entries(tools)) {
    const policy = getComposioToolPolicy(name);
    if (!policy || policy.risk === "destructive" || disabled.has(name)) {
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
