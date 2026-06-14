import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type {
  FindingState,
  FindingWithContext,
} from "../types/intelligence-findings";

async function getWorkspaceId(): Promise<string | null> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    return workspace.id;
  } catch {
    return null;
  }
}

/**
 * Fetch findings for the Queue
 *
 * Returns findings with person/org context, sorted by priority:
 * 1. Revenue signals first (closing > buying > upsell > risk)
 * 2. Then pending actions
 * 3. Then new relationships
 */
export const listQueueFindings = cache(
  async (state: FindingState = "needs_you"): Promise<FindingWithContext[]> => {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return [];

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("intelligence_findings")
      .select(
        `
        *,
        person:people (
          id,
          name,
          email
        ),
        org:organizations (
          id,
          name
        )
      `
      )
      .eq("workspace_id", workspaceId)
      .eq("state", state)
      .order("created_at", { ascending: false });

    if (error) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const supabaseProjectRef =
        supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "unknown";
      const errorSummary = [
        error.code,
        error.message,
        error.details,
        error.hint,
      ]
        .filter(Boolean)
        .join(" | ");
      console.error(
        "[intelligence-findings] listQueueFindings error:",
        errorSummary || String(error),
        { supabaseProjectRef }
      );
      if (
        error.code === "PGRST205" ||
        error.message?.includes("intelligence_findings")
      ) {
        console.warn(
          `[intelligence-findings] Table not available on Supabase project "${supabaseProjectRef}". Plays intelligence requires staging: pnpm dev:staging:op`
        );
      }
      return [];
    }

    return sortFindingsByPriority(data as FindingWithContext[]);
  }
);

/**
 * Count findings by state
 */
export const countFindingsByState = cache(async (): Promise<{
  needs_you: number;
  auto_handled: number;
}> => {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) return { needs_you: 0, auto_handled: 0 };

  const supabase = await createClient();

  const [needsYou, autoHandled] = await Promise.all([
    supabase
      .from("intelligence_findings")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("state", "needs_you"),
    supabase
      .from("intelligence_findings")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("state", "auto_handled"),
  ]);

  return {
    needs_you: needsYou.count ?? 0,
    auto_handled: autoHandled.count ?? 0,
  };
});

/**
 * Get a single finding by ID
 */
export const getFinding = cache(
  async (id: string): Promise<FindingWithContext | null> => {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) return null;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("intelligence_findings")
      .select(
        `
        *,
        person:people (
          id,
          name,
          email
        ),
        org:organizations (
          id,
          name
        )
      `
      )
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      console.error("Failed to fetch finding:", error);
      return null;
    }

    return data as FindingWithContext;
  }
);

/**
 * Sort findings by priority (revenue first, then pending, then new)
 */
function sortFindingsByPriority(
  findings: FindingWithContext[]
): FindingWithContext[] {
  const PRIORITY: Record<string, number> = {
    revenue_closing: 1,
    revenue_buying: 2,
    revenue_upsell: 3,
    revenue_risk: 4,
    pending_deliverable: 5,
    pending_question: 6,
    pending_reply: 7,
    referral: 8,
    new_person: 9,
    new_org: 10,
  };

  return [...findings].sort((a, b) => {
    const priorityA = PRIORITY[a.finding_type] ?? 99;
    const priorityB = PRIORITY[b.finding_type] ?? 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}
