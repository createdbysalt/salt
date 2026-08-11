import "server-only";

/**
 * Memory → Customize — entry queries (Phase M1).
 *
 * Reads `memory_customize_entries` for the Customize surface and the
 * pipeline consumers (Phase M4). Entries are workspace-scoped; the user
 * client + RLS enforces membership.
 */

import { createClient } from "@/app/_lib/supabase/server";
import type {
  MemoryCustomizeEntityType,
  MemoryCustomizeScope,
} from "./default-guidance";
import { scopesForPrompt } from "./default-guidance";
import { formatCustomizePromptBlock } from "./prompt-block";

export type CustomizeEntrySource =
  | "user"
  | "ask_salt"
  | "correction"
  | "reflection";

export interface CustomizeEntry {
  id: string;
  entityType: MemoryCustomizeScope;
  body: string;
  source: CustomizeEntrySource;
  status: "active" | "reverted";
  createdAt: string;
}

interface EntryRow {
  id: string;
  entity_type: string;
  body: string;
  source: string;
  status: string;
  created_at: string;
}

function toEntry(row: EntryRow): CustomizeEntry {
  return {
    id: row.id,
    entityType: row.entity_type as MemoryCustomizeScope,
    body: row.body,
    source: row.source as CustomizeEntrySource,
    status: row.status as CustomizeEntry["status"],
    createdAt: row.created_at,
  };
}

/**
 * Active entries for one record type, oldest first — the rendered doc is a
 * view composed from these rows, so order is the reading order.
 */
export async function listCustomizeEntries(
  workspaceId: string,
  entityType: MemoryCustomizeScope,
): Promise<CustomizeEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_customize_entries")
    .select("id, entity_type, body, source, status, created_at")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[memory-customize] list failed:", error);
    return [];
  }
  return (data as EntryRow[]).map(toEntry);
}

/**
 * All active entries for a workspace, grouped by record type — the shape
 * Phase M4 prompt injection consumes (one query per decision, not per type).
 */
export async function listActiveCustomizeEntriesByType(
  workspaceId: string,
): Promise<Partial<Record<MemoryCustomizeScope, CustomizeEntry[]>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_customize_entries")
    .select("id, entity_type, body, source, status, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[memory-customize] list-by-type failed:", error);
    return {};
  }

  const grouped: Partial<Record<MemoryCustomizeScope, CustomizeEntry[]>> =
    {};
  for (const row of data as EntryRow[]) {
    const entry = toEntry(row);
    (grouped[entry.entityType] ??= []).push(entry);
  }
  return grouped;
}

/**
 * The fenced prompt block for Track A injection (Phase M4) — active
 * entries for the given record types (default: all), formatted with the
 * entry/char budget. General entries apply to every record type, so they
 * are always included, first in line for the budget. Returns null when
 * there's nothing to inject, so call sites can skip cleanly. One DB read
 * per decision, not per type.
 */
export async function getCustomizePromptBlock(
  workspaceId: string,
  types?: readonly MemoryCustomizeEntityType[],
): Promise<string | null> {
  const grouped = await listActiveCustomizeEntriesByType(workspaceId);
  const entries = scopesForPrompt(types).flatMap(
    (scope) => grouped[scope] ?? [],
  );
  return formatCustomizePromptBlock(entries);
}
