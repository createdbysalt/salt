import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { getComposioProviderForToolSlug } from "@/app/_features/connectors/connector-capabilities";
import type { ToolRiskClass } from "./tool-policy";

export type ToolExecutionSource =
  | "ask_salt"
  | "server_action"
  | "background"
  | "play";
export type ToolExecutionStatus = "success" | "error" | "blocked";

const MAX_SUMMARY_STRING_LENGTH = 200;
const MAX_ERROR_LENGTH = 2000;

export interface ToolExecutionLogParams {
  workspaceId: string;
  toolSlug: string;
  risk: ToolRiskClass;
  source: ToolExecutionSource;
  status: ToolExecutionStatus;
  /** Auth user who triggered the execution; null for unattended contexts. */
  userId?: string | null;
  /** Auth user who approved a mutating execution; null for auto-executed reads. */
  approvedBy?: string | null;
  args?: unknown;
  error?: string | null;
  /**
   * Explicit provider override for synthetic slugs (e.g. capture_backfill:gmail)
   * that the TOOLKIT_ACTION prefix map can't derive. Omit for real Composio slugs.
   */
  provider?: string | null;
}

/**
 * Shallow-recursive argument summary for the audit row: keeps recipients,
 * subjects, and event fields intact while truncating long strings so full
 * email bodies are never persisted.
 */
export function summarizeToolArgs(args: unknown): Record<string, unknown> | null {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return null;
  }

  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (typeof value === "string" && value.length > MAX_SUMMARY_STRING_LENGTH) {
      summary[key] = `${value.slice(0, MAX_SUMMARY_STRING_LENGTH)}… (${value.length} chars)`;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      summary[key] = summarizeToolArgs(value);
    } else {
      summary[key] = value;
    }
  }
  return summary;
}

/** "GMAIL_SEND_EMAIL" → "Gmail send email" for user-facing activity titles. */
function humanizeToolSlug(slug: string): string {
  const words = slug.replace(/-/g, "_").split("_").filter(Boolean);
  if (words.length === 0) return slug;
  return words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase(),
    )
    .join(" ");
}

const SOURCE_PROVENANCE: Record<ToolExecutionSource, string> = {
  ask_salt: "You approved this in Ask Salt.",
  play: "Pre-approved when you enabled the play.",
  server_action: "You approved this action.",
  background: "Ran as part of a background job.",
};

/**
 * Audit parity (5.5.6): successful mutating executions also land in the
 * user-visible Activity feed — "Salt ran X" with consent provenance —
 * mirroring how record changes surface with their provenance.
 */
async function appendActivityEntry(
  admin: ReturnType<typeof createAdminClient>,
  params: ToolExecutionLogParams,
): Promise<void> {
  if (params.status !== "success" || params.risk === "read") {
    return;
  }
  const { error } = await admin.from("activity_entries").insert({
    workspace_id: params.workspaceId,
    actor_user_id: params.userId ?? null,
    action: "ran",
    title: `Salt ran ${humanizeToolSlug(params.toolSlug)}`,
    detail: SOURCE_PROVENANCE[params.source],
    metadata: {
      tool_slug: params.toolSlug,
      provider:
        params.provider ?? getComposioProviderForToolSlug(params.toolSlug),
      risk: params.risk,
      source: params.source,
      approved_by: params.approvedBy ?? null,
    },
  });
  if (error) {
    console.error("[composio] failed to append tool activity entry:", error);
  }
}

/**
 * Append-only audit write to workspace_tool_executions (service role).
 * Never throws — a logging failure must not break or block tool execution.
 */
export async function logToolExecution(params: ToolExecutionLogParams): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("workspace_tool_executions").insert({
      workspace_id: params.workspaceId,
      user_id: params.userId ?? null,
      approved_by: params.approvedBy ?? null,
      tool_slug: params.toolSlug,
      provider:
        params.provider ?? getComposioProviderForToolSlug(params.toolSlug),
      risk: params.risk,
      source: params.source,
      status: params.status,
      args_summary: summarizeToolArgs(params.args) as Json,
      error: params.error ? params.error.slice(0, MAX_ERROR_LENGTH) : null,
    });
    if (error) {
      console.error("[composio] failed to log tool execution:", error);
    }
    await appendActivityEntry(admin, params);
  } catch (error) {
    console.error("[composio] failed to log tool execution:", error);
  }
}
