import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";

export type PlaybookCustomizeEntrySource =
  | "user"
  | "ask_salt"
  | "correction"
  | "reflection";

export interface PlaybookCustomizeEntry {
  id: string;
  body: string;
  source: PlaybookCustomizeEntrySource;
  status: "active" | "reverted";
  createdAt: string;
}

export const listPlaybookCustomizeEntries = cache(
  async (
    workspaceId: string,
    playbookSlug: string
  ): Promise<PlaybookCustomizeEntry[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("playbook_customize_entries")
      .select("id, body, source, status, created_at")
      .eq("workspace_id", workspaceId)
      .eq("playbook_slug", playbookSlug)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("listPlaybookCustomizeEntries error:", error);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      body: row.body,
      source: row.source as PlaybookCustomizeEntrySource,
      status: row.status as "active" | "reverted",
      createdAt: row.created_at,
    }));
  }
);

/* ─────────────────────────────────────────────────────────────────────────────
 * Recent adjustments (Customize tab)
 *
 * Draft edits and dismissals on this playbook's runs — "where Salt adapted"
 * is really "where you corrected Salt". Two-step because activity_entries
 * keys on play_run_id and the playbook attribution lives on the run's
 * source_context jsonb.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface PlaybookAdjustment {
  id: string;
  action: "edited" | "dismissed";
  title: string;
  createdAt: string;
  /** Present on edits: draft length before / after, for pattern derivation. */
  previousLength?: number;
  newLength?: number;
}

export async function listPlaybookAdjustments(
  workspaceId: string,
  playbookSlug: string,
  limit = 20
): Promise<PlaybookAdjustment[]> {
  const supabase = await createClient();

  const { data: runs, error: runsError } = await supabase
    .from("play_runs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("source_context->>playbook_slug", playbookSlug)
    .order("created_at", { ascending: false })
    .limit(100);

  if (runsError) {
    console.error("listPlaybookAdjustments runs error:", runsError);
    return [];
  }

  const runIds = (runs ?? []).map((r) => r.id);
  if (runIds.length === 0) return [];

  const { data, error } = await supabase
    .from("activity_entries")
    .select("id, action, title, metadata, created_at")
    .eq("workspace_id", workspaceId)
    .in("play_run_id", runIds)
    .in("action", ["edited", "dismissed"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listPlaybookAdjustments error:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const metadata = row.metadata as {
      previous_length?: unknown;
      new_length?: unknown;
    } | null;
    return {
      id: row.id,
      action: row.action as "edited" | "dismissed",
      title: row.title,
      createdAt: row.created_at,
      previousLength:
        typeof metadata?.previous_length === "number"
          ? metadata.previous_length
          : undefined,
      newLength:
        typeof metadata?.new_length === "number"
          ? metadata.new_length
          : undefined,
    };
  });
}
