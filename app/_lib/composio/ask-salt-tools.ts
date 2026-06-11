import "server-only";

import type { ToolSet } from "ai";
import {
  getComposioToolPolicy,
  listAgentExposableToolSlugs,
  parseComposioToolInput,
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
}

function withValidatedExecute(slug: string, tool: ToolSet[string]): ToolSet[string] {
  const execute = tool.execute;
  if (typeof execute !== "function") {
    return tool;
  }

  const validatedExecute: typeof execute = async (input, executionOptions) => {
    const validatedInput = parseComposioToolInput(slug, input);
    return execute(validatedInput, executionOptions);
  };

  return { ...tool, execute: validatedExecute };
}

/**
 * Wrap Composio AI SDK tools with Salt policy:
 * - only allowlisted tool slugs pass through (router meta-tools and unknown
 *   toolkit tools are dropped)
 * - destructive tools are never registered, regardless of approval
 * - workspace-disabled tools are never registered
 * - tool arguments are validated against Salt's Zod schemas before execution
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

    const validatedTool = withValidatedExecute(name, tool);

    if (policy.requiresHumanConfirmation) {
      wrapped[name] = {
        ...validatedTool,
        needsApproval: true,
      };
    } else {
      wrapped[name] = validatedTool;
    }
  }

  return wrapped;
}
