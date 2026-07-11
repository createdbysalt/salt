import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { createClient } from "@/app/_lib/supabase/server";

export interface PlayerContextRow {
  id: string;
  workspace_id: string;
  player_slug: string;
  domain_knowledge: string | null;
  tone_preferences: string | null;
  workflow_preferences: string | null;
  context_doc: string | null;
  context_budget: number;
  created_at: string;
  updated_at: string;
}

/**
 * Load player context for a workspace (RLS-enforced).
 * Returns null if no context exists for this player.
 */
export async function getPlayerContext(
  workspaceId: string,
  playerSlug: string,
): Promise<PlayerContextRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_context")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("player_slug", playerSlug)
    .maybeSingle();

  if (error) {
    console.error("[players] failed to load player context:", error);
    return null;
  }

  return data as PlayerContextRow | null;
}

/**
 * Load player context using admin client (no RLS, for play executor).
 */
export async function getPlayerContextAdmin(
  workspaceId: string,
  playerSlug: string,
): Promise<PlayerContextRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("player_context")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("player_slug", playerSlug)
    .maybeSingle();

  if (error) {
    console.error("[players] failed to load player context (admin):", error);
    return null;
  }

  return data as PlayerContextRow | null;
}

/**
 * Assemble player context for LLM injection (budgeted).
 * Returns empty string if no context or budget exceeded.
 */
export async function assemblePlayerContext(
  workspaceId: string,
  playerSlug: string,
): Promise<string> {
  const ctx = await getPlayerContextAdmin(workspaceId, playerSlug);
  if (!ctx?.context_doc) return "";

  const budget = ctx.context_budget ?? 1500;
  const doc = ctx.context_doc.trim();

  if (doc.length <= budget) {
    return doc;
  }

  return doc.slice(0, budget - 3) + "...";
}

/**
 * List all player contexts for a workspace.
 */
export async function listPlayerContexts(
  workspaceId: string,
): Promise<PlayerContextRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_context")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("player_slug");

  if (error) {
    console.error("[players] failed to list player contexts:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      workspaceId,
    });
    return [];
  }

  return (data ?? []) as PlayerContextRow[];
}
