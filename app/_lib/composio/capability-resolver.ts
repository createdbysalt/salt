import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatusAdmin } from "./connections";
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
  const [first] = await resolveCapabilityTools(capabilityKey, workspaceId);
  return first ?? null;
}

/**
 * Multi-app fan-out (playbooks Phase 4): every runnable tool for the
 * capability, in priority order — connected provider + approved
 * classification, minus the workspace's per-play exclusions. A verify step
 * written against Stripe then also checks QuickBooks when both are
 * connected; excluding QuickBooks for one play takes it out of that play's
 * fan-out without disconnecting anything.
 */
export async function resolveCapabilityTools(
  capabilityKey: string,
  workspaceId: string,
  options?: { excludeProviders?: ReadonlySet<string> },
): Promise<ResolvedCapabilityTool[]> {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("tool_capabilities")
    .select("tool_slug, provider_key, priority")
    .eq("capability_key", capabilityKey)
    .order("priority", { ascending: true });

  if (error || !rows || rows.length === 0) {
    return [];
  }

  const excluded = options?.excludeProviders;

  // Cache connection lookups per provider across candidates.
  const connectionByProvider = new Map<
    string,
    { connected: boolean; connectionId: string | null }
  >();

  const resolved: ResolvedCapabilityTool[] = [];

  for (const row of rows as CapabilityRow[]) {
    if (excluded?.has(row.provider_key)) {
      continue;
    }

    let connection = connectionByProvider.get(row.provider_key);
    if (!connection) {
      // Admin variant: the resolver runs in session-less system contexts
      // (signal dispatch, crons, enrichment) where the session-scoped
      // client would return zero rows under RLS.
      const status = await getConnectionStatusAdmin(row.provider_key, workspaceId);
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

    resolved.push({
      capabilityKey,
      toolSlug: row.tool_slug,
      provider: row.provider_key,
      connectionId: connection.connectionId,
      risk: policy.risk,
      requiresHumanConfirmation: policy.requiresHumanConfirmation,
    });
  }

  return resolved;
}

/**
 * Reverse lookup for fan-out: which capability keys each declared tool
 * serves. Agent steps use it to find the sibling tools other providers
 * offer for the same capabilities.
 */
export async function listCapabilityKeysForToolSlugs(
  toolSlugs: readonly string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (toolSlugs.length === 0) {
    return map;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_capabilities")
    .select("capability_key, tool_slug")
    .in("tool_slug", [...toolSlugs]);

  if (error || !data) {
    return map;
  }

  for (const row of data as { capability_key: string; tool_slug: string }[]) {
    const keys = map.get(row.tool_slug) ?? [];
    keys.push(row.capability_key);
    map.set(row.tool_slug, keys);
  }

  return map;
}

/** True when the workspace has at least one runnable tool for the capability. */
export async function workspaceHasCapability(
  capabilityKey: string,
  workspaceId: string,
): Promise<boolean> {
  return (await resolveCapabilityTool(capabilityKey, workspaceId)) !== null;
}
