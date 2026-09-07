import "server-only";

/**
 * User-authored playbook definitions (DB storage).
 *
 * Design of record: docs/plans/2026-08-08-playbook-definitions-storage.md
 *
 * The registry is storage-agnostic: repo files hold Salt-authored pre-mades,
 * this module holds workspace-owned rows. Validation is application-side —
 * `validatePlaybookV2` on write (single writer path) and again on read, so a
 * schema upgrade can never strand a row silently: invalid rows are reported
 * and skipped exactly like malformed repo files.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { validatePlaybookV2 } from "./schema/v2/parser";
import type {
  ParsedPlaybookV2,
  PlaybookDefinitionV2,
} from "./schema/v2/types";

export type SavePlaybookDefinitionResult =
  | { ok: true; data: { slug: string; version: string } }
  | { ok: false; errors: string[] };

/**
 * Single writer path for user-authored definitions. Zod-validates the full
 * document before upsert; an invalid definition can never reach the
 * registry because the registry only reads rows written here.
 *
 * Upsert on (workspace_id, slug): re-saving a slug edits in place. Version
 * bumps are the author's job (semver enforced by the schema).
 */
export async function savePlaybookDefinition(input: {
  workspaceId: string;
  definition: unknown;
  createdBy?: string | null;
}): Promise<SavePlaybookDefinitionResult> {
  const validation = validatePlaybookV2(input.definition);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
    };
  }

  const definition = input.definition as PlaybookDefinitionV2;
  const admin = createAdminClient();

  const { error } = await admin.from("playbook_definitions").upsert(
    {
      workspace_id: input.workspaceId,
      slug: definition.slug,
      version: definition.version,
      definition: definition as unknown as Json,
      source: "db",
      status: "active",
      created_by: input.createdBy ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,slug" }
  );

  if (error) {
    return { ok: false, errors: [error.message] };
  }
  return { ok: true, data: { slug: definition.slug, version: definition.version } };
}

export interface WorkspacePlaybookDefinitions {
  playbooks: ParsedPlaybookV2[];
  /** Rows that failed re-validation after a schema upgrade — reported, never dropped silently. */
  errors: Array<{ file: string; errors: string[] }>;
}

/**
 * Read path: active definitions owned by the workspace. Every row is
 * re-validated on read (belt-and-suspenders over the write-path validation)
 * so a breaking schema upgrade surfaces the row as a discovery-style error
 * instead of executing a stale definition.
 */
export async function listWorkspacePlaybookDefinitions(
  workspaceId: string
): Promise<WorkspacePlaybookDefinitions> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("playbook_definitions")
    .select("slug, definition")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  if (error) {
    return {
      playbooks: [],
      errors: [{ file: "playbook_definitions", errors: [error.message] }],
    };
  }

  const playbooks: ParsedPlaybookV2[] = [];
  const errors: Array<{ file: string; errors: string[] }> = [];

  for (const row of data ?? []) {
    const validation = validatePlaybookV2(row.definition);
    if (!validation.valid) {
      errors.push({
        file: `db:${row.slug}`,
        errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
      });
      continue;
    }
    playbooks.push({
      definition: row.definition as unknown as PlaybookDefinitionV2,
      sectionMeta: null,
      validationErrors: [],
    });
  }

  return { playbooks, errors };
}

/**
 * Soft lifecycle: archived definitions stay readable so historical
 * play_runs.source_context->>playbook_slug still resolves names.
 */
export async function archivePlaybookDefinition(
  workspaceId: string,
  slug: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("playbook_definitions")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("slug", slug);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
