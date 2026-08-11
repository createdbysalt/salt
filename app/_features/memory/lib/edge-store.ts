/**
 * Unified explicit-edge store helpers (keeper-field-contracts Phase 4).
 *
 * `entity_links` is THE table for explicit graph edges — user links, Memory
 * Care links, and note [[wikilink]] mentions. Structured edges (real FKs like
 * organization_people or billing_records.person_id) stay in their domain
 * tables and are PROJECTED at query time; they never write here.
 *
 * All entity types use the short dialect (person, org, work, billing,
 * meeting, resource, note, space) — adapt other spellings at the boundary with
 * memory/types/entity-type.ts before calling in. Reads and deletes dual-read
 * the legacy `file` spelling for rows written before the
 * `20260810150000_rename_files_to_resources` backfill.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_lib/supabase/database.types";

export type EdgeEntityType =
  | "person"
  | "org"
  | "work"
  | "billing"
  | "meeting"
  | "resource"
  | "note"
  | "space";

export type EdgeRelationType =
  | "employment"
  | "payment"
  | "attachment"
  | "mention"
  | "related";

export type EdgeProvenanceSource = "manual" | "care" | "system";

export type EdgeRef = { type: EdgeEntityType; id: string };

export type UpsertEdgeInput = {
  workspaceId: string;
  source: EdgeRef;
  target: EdgeRef;
  relationType?: EdgeRelationType;
  provenance?: {
    source: EdgeProvenanceSource;
    confidence?: number;
    because?: string;
  };
  createdBy?: string | null;
};

type AnySupabase = SupabaseClient<Database>;

export type EdgeResult = { ok: true } | { ok: false; message: string };

/**
 * Canon spelling plus the pre-rename legacy spelling, for dual-read of rows
 * written before the `20260810150000` backfill. Writes always use canon.
 */
function dbSpellings(type: EdgeEntityType): string[] {
  return type === "resource" ? ["resource", "file"] : [type];
}

/** Insert an edge; an existing identical edge counts as success. */
export async function upsertEdge(
  client: AnySupabase,
  input: UpsertEdgeInput
): Promise<EdgeResult> {
  const { error } = await client.from("entity_links").insert({
    workspace_id: input.workspaceId,
    source_type: input.source.type,
    source_id: input.source.id,
    target_type: input.target.type,
    target_id: input.target.id,
    relation_type: input.relationType ?? "related",
    source: input.provenance?.source ?? "manual",
    confidence: input.provenance?.confidence ?? null,
    because: input.provenance?.because ?? null,
    created_by: input.createdBy ?? null,
  });

  if (error && error.code !== "23505") {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * Delete the edge(s) between two entities, in both directions.
 * Scope to one relationType to leave other edge kinds intact (e.g. removing
 * a manual link must not delete a wikilink mention — mentions re-sync from
 * note content and belong to the note).
 */
export async function deleteEdgeBetween(
  client: AnySupabase,
  input: {
    workspaceId: string;
    a: EdgeRef;
    b: EdgeRef;
    relationType?: EdgeRelationType;
  }
): Promise<EdgeResult> {
  let query = client
    .from("entity_links")
    .delete()
    .eq("workspace_id", input.workspaceId);

  const clauses = new Set<string>();
  for (const aType of dbSpellings(input.a.type)) {
    for (const bType of dbSpellings(input.b.type)) {
      clauses.add(
        `and(source_type.eq.${aType},source_id.eq.${input.a.id},target_type.eq.${bType},target_id.eq.${input.b.id})`
      );
      clauses.add(
        `and(source_type.eq.${bType},source_id.eq.${input.b.id},target_type.eq.${aType},target_id.eq.${input.a.id})`
      );
    }
  }
  query = query.or([...clauses].join(","));

  if (input.relationType) {
    query = query.eq("relation_type", input.relationType);
  }
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Delete every edge where the entity is the SOURCE (e.g. a note's mentions). */
export async function deleteEdgesFrom(
  client: AnySupabase,
  input: {
    workspaceId?: string;
    source: EdgeRef;
    relationType?: EdgeRelationType;
  }
): Promise<EdgeResult> {
  const spellings = dbSpellings(input.source.type);
  let query = client
    .from("entity_links")
    .delete()
    .eq("source_id", input.source.id);
  query =
    spellings.length === 1
      ? query.eq("source_type", spellings[0]!)
      : query.in("source_type", spellings);
  if (input.workspaceId) query = query.eq("workspace_id", input.workspaceId);
  if (input.relationType) query = query.eq("relation_type", input.relationType);
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
