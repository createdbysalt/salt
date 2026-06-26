import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type {
  FindingState,
  FindingWithContext,
} from "../types/intelligence-findings";
import {
  filterActionableMemoryProposals,
  parseMemoryProposals,
} from "../types/memory-proposals";
import { fetchCaptureSourceUrlMap } from "../utils/fetch-capture-source-urls";
import { buildGmailInboxUrl } from "../utils/capture-source-url";

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
      .order("created_at", { ascending: false })
      .limit(50);

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

    return attachSourceUrlsToFindings(
      enrichFindingsWithMemory(sortFindingsByPriority(data as FindingWithContext[])),
      workspaceId,
      supabase
    );
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

    const finding = enrichFindingWithMemory(data as FindingWithContext);
    const [withUrl] = await attachSourceUrlsToFindings(
      [finding],
      workspaceId,
      supabase
    );
    return withUrl ?? null;
  }
);

/**
 * Sort findings by priority (revenue first, then pending, then new)
 */
async function attachSourceUrlsToFindings(
  findings: FindingWithContext[],
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<FindingWithContext[]> {
  const captureIds = findings
    .map((f) => f.evidence?.source_id)
    .filter((id): id is string => Boolean(id));

  const urlByCaptureId = await fetchCaptureSourceUrlMap(
    supabase,
    workspaceId,
    captureIds
  );

  return findings.map((finding) => {
    const metadata = finding.evidence?.metadata;
    const metaThreadId =
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      typeof (metadata as { thread_id?: unknown }).thread_id === "string"
        ? (metadata as { thread_id: string }).thread_id
        : null;
    const metaMessageId =
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      typeof (metadata as { message_id?: unknown }).message_id === "string"
        ? (metadata as { message_id: string }).message_id
        : null;

    const fromEvidenceMeta = buildGmailInboxUrl({
      threadId: metaThreadId,
      messageId: metaMessageId,
    });

    const fromCapture =
      finding.evidence?.source_id != null
        ? urlByCaptureId.get(finding.evidence.source_id) ?? null
        : null;

    return {
      ...finding,
      source_url: fromCapture ?? fromEvidenceMeta,
    };
  });
}

function enrichFindingsWithMemory(
  findings: FindingWithContext[]
): FindingWithContext[] {
  return findings.map(enrichFindingWithMemory);
}

function enrichFindingWithMemory(finding: FindingWithContext): FindingWithContext {
  const metadata = finding.evidence?.metadata;
  const rawProposals =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    "memory_proposals" in metadata
      ? (metadata as { memory_proposals?: unknown }).memory_proposals
      : undefined;

  const appliedAt =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    typeof (metadata as { memory_applied_at?: unknown }).memory_applied_at ===
      "string"
      ? (metadata as { memory_applied_at: string }).memory_applied_at
      : null;

  return {
    ...finding,
    memory_proposals: filterActionableMemoryProposals(parseMemoryProposals(rawProposals)),
    memory_applied_at: appliedAt,
  };
}

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
    needs_routing: 9,
    new_person: 10,
    new_org: 11,
  };

  return [...findings].sort((a, b) => {
    const aFlagged = a.flagged_at ? 1 : 0;
    const bFlagged = b.flagged_at ? 1 : 0;
    if (aFlagged !== bFlagged) return bFlagged - aFlagged;

    const priorityA = PRIORITY[a.finding_type] ?? 99;
    const priorityB = PRIORITY[b.finding_type] ?? 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}
