import "server-only";

/**
 * Blocklist Manager (Captures V2 Phase 5.3).
 *
 * Manages custom blocklists for spam filtering:
 * - Workspace-specific domain blocklists
 * - Email pattern blocklists
 * - Sender name pattern blocklists
 *
 * Works alongside the built-in pre-ingest gate blocklists.
 */

import {
  isValidSenderGlobPattern,
  matchesSenderGlobPattern,
} from "@repo/security";
import { createAdminClient } from "@/app/_lib/supabase/admin";

export type BlocklistType = "domain" | "email" | "sender_pattern";

export interface BlocklistEntry {
  id: string;
  workspaceId: string;
  type: BlocklistType;
  value: string;
  reason: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface AddBlocklistEntryInput {
  workspaceId: string;
  type: BlocklistType;
  value: string;
  reason?: string;
  createdBy?: string;
}

export interface BlocklistStats {
  totalEntries: number;
  byType: Record<BlocklistType, number>;
  recentlyAdded: BlocklistEntry[];
}

/**
 * Get all blocklist entries for a workspace.
 */
export async function getBlocklistEntries(
  workspaceId: string,
  options: { type?: BlocklistType; limit?: number } = {}
): Promise<BlocklistEntry[]> {
  const { type, limit = 100 } = options;
  const admin = createAdminClient();

  let query = admin
    .from("capture_blocklist")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[blocklist-manager] getBlocklistEntries error:", error);
    return [];
  }

  return (data ?? []).map(mapBlocklistEntry);
}

/**
 * Add a new blocklist entry.
 */
export async function addBlocklistEntry(
  input: AddBlocklistEntryInput
): Promise<{ success: boolean; entry?: BlocklistEntry; error?: string }> {
  const { workspaceId, type, value, reason, createdBy } = input;

  const normalizedValue = normalizeBlocklistValue(type, value);
  if (!normalizedValue) {
    return { success: false, error: "Invalid value format" };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("capture_blocklist")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("type", type)
    .eq("value", normalizedValue)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Entry already exists" };
  }

  const { data, error } = await admin
    .from("capture_blocklist")
    .insert({
      workspace_id: workspaceId,
      type,
      value: normalizedValue,
      reason: reason ?? null,
      created_by: createdBy ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[blocklist-manager] addBlocklistEntry error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, entry: mapBlocklistEntry(data) };
}

/**
 * Remove a blocklist entry.
 */
export async function removeBlocklistEntry(
  workspaceId: string,
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("capture_blocklist")
    .delete()
    .eq("id", entryId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[blocklist-manager] removeBlocklistEntry error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get blocklist statistics for a workspace.
 */
export async function getBlocklistStats(
  workspaceId: string
): Promise<BlocklistStats> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("capture_blocklist")
    .select("type, created_at")
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[blocklist-manager] getBlocklistStats error:", error);
    return {
      totalEntries: 0,
      byType: { domain: 0, email: 0, sender_pattern: 0 },
      recentlyAdded: [],
    };
  }

  const entries = data ?? [];
  const byType: Record<BlocklistType, number> = {
    domain: 0,
    email: 0,
    sender_pattern: 0,
  };

  for (const entry of entries) {
    const type = entry.type as BlocklistType;
    if (type in byType) {
      byType[type]++;
    }
  }

  const recentEntries = await getBlocklistEntries(workspaceId, { limit: 5 });

  return {
    totalEntries: entries.length,
    byType,
    recentlyAdded: recentEntries,
  };
}

// Sender identifiers are attacker-controlled (they arrive on inbound mail).
// They must never reach a PostgREST filter-expression string, and values
// containing filter metacharacters (`,`, `(`, `)`, quotes, whitespace) are
// treated as hostile and fail closed.
const SAFE_DOMAIN_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;
const SAFE_EMAIL_PATTERN = /^[^\s,()"'@]+@[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;

/**
 * Check if a value is blocked by the workspace blocklist.
 *
 * Lookups are exact type+value pairs via parameterized `.eq()` filters —
 * never string-built `.or()` expressions (PostgREST filter injection).
 */
export async function isBlocked(
  workspaceId: string,
  checks: {
    domain?: string;
    email?: string;
    senderName?: string;
  }
): Promise<{ blocked: boolean; reason?: string; matchedEntry?: BlocklistEntry }> {
  const lookups: Array<{ type: "domain" | "email"; value: string }> = [];

  if (checks.domain) {
    const domain = checks.domain.trim().toLowerCase();
    if (!SAFE_DOMAIN_PATTERN.test(domain)) {
      return { blocked: true, reason: "Sender identifiers failed validation" };
    }
    lookups.push({ type: "domain", value: domain });
  }

  if (checks.email) {
    const email = checks.email.trim().toLowerCase();
    if (!SAFE_EMAIL_PATTERN.test(email)) {
      return { blocked: true, reason: "Sender identifiers failed validation" };
    }
    lookups.push({ type: "email", value: email });
  }

  const admin = createAdminClient();

  if (lookups.length > 0) {
    const results = await Promise.all(
      lookups.map((lookup) =>
        admin
          .from("capture_blocklist")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("type", lookup.type)
          .eq("value", lookup.value)
          .limit(1)
          .maybeSingle()
      )
    );

    for (const { data, error } of results) {
      if (error) {
        // Fail open on infra errors: a blocklist outage must not drop ALL
        // inbound mail. Hostile input never reaches this path — it fails
        // closed at validation above.
        console.error("[blocklist-manager] isBlocked error:", error);
        continue;
      }
      if (data) {
        return {
          blocked: true,
          reason: data.reason ?? `Blocked by ${data.type} blocklist`,
          matchedEntry: mapBlocklistEntry(data),
        };
      }
    }
  }

  if (checks.senderName) {
    const { data: patternData } = await admin
      .from("capture_blocklist")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("type", "sender_pattern")
      .limit(100);

    for (const entry of patternData ?? []) {
      if (matchesSenderGlobPattern(entry.value, checks.senderName)) {
        return {
          blocked: true,
          reason: entry.reason ?? `Matched sender pattern: ${entry.value}`,
          matchedEntry: mapBlocklistEntry(entry),
        };
      }
    }
  }

  return { blocked: false };
}

function normalizeBlocklistValue(type: BlocklistType, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  switch (type) {
    case "domain":
      return trimmed.toLowerCase().replace(/^@/, "");
    case "email":
      return trimmed.toLowerCase();
    case "sender_pattern":
      return isValidSenderGlobPattern(trimmed) ? trimmed : null;
  }
}

function mapBlocklistEntry(row: Record<string, unknown>): BlocklistEntry {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    type: row.type as BlocklistType,
    value: row.value as string,
    reason: (row.reason as string) ?? null,
    createdAt: row.created_at as string,
    createdBy: (row.created_by as string) ?? null,
  };
}
