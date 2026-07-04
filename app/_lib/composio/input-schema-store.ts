import "server-only";

/**
 * Synced tool input schemas (connector-platform Phase 5.5.2).
 *
 * Cached reads of connector_tools.input_schema for the generic executor —
 * the boundary-validation source for tools that have no hand-written Zod
 * schema. Mirrors classification-store's caching posture: short TTL,
 * negative cache, errors → null (fail closed at the caller).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const TTL_MS = 60_000;
const NEGATIVE_TTL_MS = 15_000;

interface CacheEntry {
  schema: unknown | null;
  toolkit: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export interface SyncedToolSchema {
  inputSchema: unknown;
  toolkit: string;
}

/**
 * Input schema + toolkit for a synced tool slug. Null when the slug isn't in
 * the catalog (or the read failed) — callers must treat null as "cannot
 * execute".
 */
export async function getSyncedToolSchema(
  toolSlug: string,
): Promise<SyncedToolSchema | null> {
  const now = Date.now();
  const cached = cache.get(toolSlug);
  if (cached && cached.expiresAt > now) {
    return cached.schema !== null && cached.toolkit !== null
      ? { inputSchema: cached.schema, toolkit: cached.toolkit }
      : null;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("connector_tools")
      .select("input_schema, toolkit_slug")
      .eq("tool_slug", toolSlug)
      .maybeSingle();

    if (error) throw error;

    if (!data?.input_schema) {
      cache.set(toolSlug, {
        schema: null,
        toolkit: null,
        expiresAt: now + NEGATIVE_TTL_MS,
      });
      return null;
    }

    cache.set(toolSlug, {
      schema: data.input_schema,
      toolkit: data.toolkit_slug,
      expiresAt: now + TTL_MS,
    });
    return { inputSchema: data.input_schema, toolkit: data.toolkit_slug };
  } catch (error) {
    console.error(
      `[input-schema-store] read failed for ${toolSlug}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/** Test hook. */
export function clearSyncedToolSchemaCache(): void {
  cache.clear();
}
