import "server-only";

/**
 * Fresh-context schema hydration (playbooks Phase 2).
 *
 * At execution start the executor hydrates the current synced input schema
 * for every tool the playbook declares, pins a schema_hash per tool into the
 * run's metadata (audit + vendor-drift detection), and validates interpolated
 * action args against the fresh schema before the call leaves Salt. The
 * hand-written pinned Zod registry stays as the gate-level fallback
 * (see app/_lib/composio/input-validation.ts).
 */

import { createHash } from "node:crypto";
import { getSyncedToolSchema } from "@/app/_lib/composio/input-schema-store";

export interface HydratedToolSchema {
  slug: string;
  schemaHash: string;
  inputSchema: unknown;
}

/** Deterministic JSON stringify (object keys sorted recursively). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

/** Short sha256 of a tool's input schema — drift detector, not a secret. */
export function hashToolSchema(schema: unknown): string {
  return createHash("sha256").update(stableStringify(schema)).digest("hex").slice(0, 16);
}

/**
 * Hydrate fresh synced schemas for the given tool slugs. Slugs without a
 * synced catalog row are omitted — the gate falls back to pinned Zod for
 * those. Never throws: hydration failure must not block a run.
 */
export async function hydrateToolSchemas(
  slugs: readonly string[],
): Promise<Map<string, HydratedToolSchema>> {
  const hydrated = new Map<string, HydratedToolSchema>();
  const unique = [...new Set(slugs)];

  const results = await Promise.all(
    unique.map(async (slug) => {
      try {
        const synced = await getSyncedToolSchema(slug);
        return synced ? { slug, inputSchema: synced.inputSchema } : null;
      } catch {
        return null;
      }
    }),
  );

  for (const result of results) {
    if (!result) continue;
    hydrated.set(result.slug, {
      slug: result.slug,
      schemaHash: hashToolSchema(result.inputSchema),
      inputSchema: result.inputSchema,
    });
  }

  return hydrated;
}

/** Compact audit record: slug → schema_hash, for play_runs.metadata. */
export function schemaHashRecord(
  hydrated: Map<string, HydratedToolSchema>,
): Record<string, string> {
  return Object.fromEntries(
    [...hydrated.values()].map((entry) => [entry.slug, entry.schemaHash]),
  );
}
