import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { MemoryProposal } from "@/app/_features/capture/types/memory-proposals";

/** Promotion threshold (Exo gate): a recurring proposed fact auto-confirms here. */
const PROMOTION_VOTE_THRESHOLD = 3;

function normalizeFact(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

type RouteArgs = {
  workspaceId: string;
  userId: string;
  proposals: MemoryProposal[];
  captureId?: string | null;
  admin?: ReturnType<typeof createAdminClient>;
};

/**
 * Route `me`-surface memory proposals into operator_memory_facts as declarative
 * statements. New facts land as `proposed` (never trusted until confirmed).
 * Recurring near-duplicates bump vote_count and auto-promote at the Exo gate.
 */
export async function routeMeFactProposals(args: RouteArgs): Promise<number> {
  const meProposals = args.proposals.filter(
    (p) => p.surface === "me" && (p.hint.fact || p.reason),
  );
  if (meProposals.length === 0) return 0;

  const admin = args.admin ?? createAdminClient();

  const { data: existing } = await admin
    .from("operator_memory_facts")
    .select("id, value, status, vote_count")
    .eq("workspace_id", args.workspaceId)
    .eq("user_id", args.userId)
    .neq("status", "dismissed");

  const byNorm = new Map<string, { id: string; status: string; vote_count: number }>();
  for (const row of existing ?? []) {
    byNorm.set(normalizeFact(row.value as string), {
      id: row.id as string,
      status: row.status as string,
      vote_count: (row.vote_count as number) ?? 1,
    });
  }

  let routed = 0;

  for (const proposal of meProposals) {
    const value = (proposal.hint.fact ?? proposal.reason).trim();
    if (!value) continue;
    const norm = normalizeFact(value);
    const match = byNorm.get(norm);

    if (match) {
      const nextVotes = match.vote_count + 1;
      const promote = match.status === "proposed" && nextVotes >= PROMOTION_VOTE_THRESHOLD;
      await admin
        .from("operator_memory_facts")
        .update({
          vote_count: nextVotes,
          ...(promote
            ? { status: "confirmed", confirmed_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", match.id);
      match.vote_count = nextVotes;
      if (promote) match.status = "confirmed";
      routed++;
      continue;
    }

    const { data: inserted } = await admin
      .from("operator_memory_facts")
      .insert({
        workspace_id: args.workspaceId,
        user_id: args.userId,
        value,
        category: "preference",
        kind: "fact",
        scope_type: "global",
        status: "proposed",
        source: "ai_capture",
        confidence: proposal.confidence,
        vote_count: 1,
        source_capture_id: args.captureId ?? null,
        provenance: { reason: proposal.reason, system_play: proposal.system_play },
      })
      .select("id, status, vote_count")
      .single();

    if (inserted) {
      byNorm.set(norm, {
        id: inserted.id as string,
        status: inserted.status as string,
        vote_count: inserted.vote_count as number,
      });
      routed++;
    }
  }

  return routed;
}
