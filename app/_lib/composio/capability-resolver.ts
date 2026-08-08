import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatus } from "./connections";
import { getApprovedToolClassification } from "./classification-store";

/**
 * Capability / intent resolver (plan 2026-07-07 WS3.3).
 *
 * A playbook step can declare an intent ("send_message") instead of a concrete
 * tool slug. This resolves the intent to the best tool the workspace can
 * actually run right now: connected provider + approved classification,
 * highest priority wins. Fail-closed — returns null when nothing
 * qualifies, and the caller no-ops with a clear activity note (never an error).
 *
 * Adding a second provider for a capability is a `tool_capabilities` row, not a
 * playbook change — a "send_message" play then runs on Gmail OR Outlook OR
 * Slack depending on what the user connected.
 */

export interface ResolvedCapabilityTool {
  capabilityKey: string;
  toolSlug: string;
  provider: string;
  /** Composio connected-account id, needed to execute the tool. */
  connectionId: string;
  risk: "read" | "mutating" | "destructive";
  requiresHumanConfirmation: boolean;
}

interface CapabilityRow {
  tool_slug: string;
  provider_key: string;
  priority: number;
}

/**
 * Resolve a capability to a runnable tool for a workspace, or null.
 * Candidates are tried in ascending priority; the first that is connected,
 * approved, and enabled wins.
 */
export async function resolveCapabilityTool(
  capabilityKey: string,
  workspaceId: string,
): Promise<ResolvedCapabilityTool | null> {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("tool_capabilities")
    .select("tool_slug, provider_key, priority")
    .eq("capability_key", capabilityKey)
    .order("priority", { ascending: true });

  if (error || !rows || rows.length === 0) {
    return null;
  }

  // Cache connection lookups per provider across candidates.
  const connectionByProvider = new Map<
    string,
    { connected: boolean; connectionId: string | null }
  >();

  for (const row of rows as CapabilityRow[]) {
    let connection = connectionByProvider.get(row.provider_key);
    if (!connection) {
      const status = await getConnectionStatus(row.provider_key, workspaceId);
      connection = {
        connected: status.connected,
        connectionId: status.composioConnectionId,
      };
      connectionByProvider.set(row.provider_key, connection);
    }
    if (!connection.connected || !connection.connectionId) {
      continue;
    }

    // Fail-closed: only approved classifications are runnable.
    const policy = await getApprovedToolClassification(row.tool_slug);
    if (!policy) {
      continue;
    }

    return {
      capabilityKey,
      toolSlug: row.tool_slug,
      provider: row.provider_key,
      connectionId: connection.connectionId,
      risk: policy.risk,
      requiresHumanConfirmation: policy.requiresHumanConfirmation,
    };
  }

  return null;
}

/** True when the workspace has at least one runnable tool for the capability. */
export async function workspaceHasCapability(
  capabilityKey: string,
  workspaceId: string,
): Promise<boolean> {
  return (await resolveCapabilityTool(capabilityKey, workspaceId)) !== null;
}
