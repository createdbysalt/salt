import "server-only";

/**
 * Earned autonomy (GROW): per-(workspace, playbook, tool) approval counter
 * with an offer-first grant flow.
 *
 * Playbook action steps marked `approval: "ask"` pause for human approval.
 * Every time an approval actually executes (resume path), the counter bumps.
 * Every EARNED_AUTONOMY_THRESHOLD executed approvals, Salt creates an
 * "autonomy offer" — a queued play_run proposing to relax the gate. Nothing
 * flips silently: the step runs without asking only after the user grants
 * the offer (`autonomy_granted_at`), and grants are revocable in
 * Settings → Plays. Steps marked `approval: "required"` are never offered
 * or earned away (hard gates stay hard).
 *
 * The counter is bumped only when an approval actually executes
 * (resume path), never on the pause itself.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { buildPlaybookSourceContext } from "@/app/_features/plays/lib/play-record";
import { formatToolSlugForHumans } from "@/app/_features/plays/utils/playbook-display";

export const EARNED_AUTONOMY_THRESHOLD = 10;

/** Marker on the offer play_run so approve/dismiss can route to grant/decline. */
export const AUTONOMY_OFFER_KIND = "autonomy_offer";

interface ApprovalRow {
  id: string;
  approved_count: number | null;
  dismissed_count: number | null;
  autonomy_granted_at: string | null;
  autonomy_offered_at: string | null;
  autonomy_declined_at: string | null;
}

/**
 * True when the user has granted autonomy for this playbook+tool combination
 * from an offer card. Deliberately grant-based, not count-based: reaching the
 * threshold creates an offer; it never flips the gate on its own.
 */
export async function hasEarnedAutonomy(
  workspaceId: string,
  playbookSlug: string,
  toolSlug: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("playbook_action_approvals")
    .select("autonomy_granted_at")
    .eq("workspace_id", workspaceId)
    .eq("playbook_slug", playbookSlug)
    .eq("tool_slug", toolSlug)
    .maybeSingle();

  if (error) {
    // Fail closed: an approval gate that errors keeps asking for approval.
    console.warn(
      `[earned-autonomy] lookup failed for ${playbookSlug}/${toolSlug}: ${error.message}`
    );
    return false;
  }

  return Boolean(data?.autonomy_granted_at);
}

/**
 * Record one executed approval for a playbook+tool combination, creating an
 * autonomy offer every time the count crosses a multiple of the threshold
 * (unless autonomy is already granted or an offer is currently open).
 */
export async function recordActionApproval(
  workspaceId: string,
  playbookSlug: string,
  toolSlug: string
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("playbook_action_approvals")
    .select(
      "id, approved_count, dismissed_count, autonomy_granted_at, autonomy_offered_at, autonomy_declined_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("playbook_slug", playbookSlug)
    .eq("tool_slug", toolSlug)
    .maybeSingle();

  const row = (existing as ApprovalRow | null) ?? null;
  const newCount = (row?.approved_count ?? 0) + 1;

  if (row) {
    await admin
      .from("playbook_action_approvals")
      .update({
        approved_count: newCount,
        last_approved_at: now,
      })
      .eq("id", row.id);
  } else {
    const { error } = await admin.from("playbook_action_approvals").insert({
      workspace_id: workspaceId,
      playbook_slug: playbookSlug,
      tool_slug: toolSlug,
      approved_count: 1,
      last_approved_at: now,
    } as never);

    if (error && error.code === "23505") {
      // Lost a concurrent-insert race — retry as an update.
      await recordActionApproval(workspaceId, playbookSlug, toolSlug);
      return;
    } else if (error) {
      console.warn(
        `[earned-autonomy] failed to record approval for ${playbookSlug}/${toolSlug}: ${error.message}`
      );
      return;
    }
  }

  await maybeCreateAutonomyOffer({
    workspaceId,
    playbookSlug,
    toolSlug,
    row,
    newCount,
  });
}

/**
 * Record a user dismissing a queued approval run. The dismissal count, with
 * the approval count, forms the approval rate that informs ask → auto
 * promotion — and gates offers (see maybeCreateAutonomyOffer).
 *
 * Called from dismissPlayRun for paused playbook runs only; autonomy offer
 * dismissals go through declineAutonomyOffer instead.
 */
export async function recordActionDismissal(
  workspaceId: string,
  playbookSlug: string,
  toolSlug: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("playbook_action_approvals")
    .select("id, dismissed_count")
    .eq("workspace_id", workspaceId)
    .eq("playbook_slug", playbookSlug)
    .eq("tool_slug", toolSlug)
    .maybeSingle();

  const dismissedCount = ((existing?.dismissed_count as number | null) ?? 0) + 1;
  const now = new Date().toISOString();

  if (existing) {
    await admin
      .from("playbook_action_approvals")
      .update({
        dismissed_count: dismissedCount,
        last_dismissed_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
    return;
  }

  await admin.from("playbook_action_approvals").insert({
    workspace_id: workspaceId,
    playbook_slug: playbookSlug,
    tool_slug: toolSlug,
    approved_count: 0,
    dismissed_count: 1,
    last_dismissed_at: now,
  } as never);
}

/**
 * Per-playbook approval analytics for a workspace. The approval rate
 * (approved / (approved + dismissed)) is the signal behind ask → auto
 * promotion; grants list the tools already running autonomously.
 */
export interface PlaybookApprovalRate {
  playbookSlug: string;
  approvedCount: number;
  dismissedCount: number;
  /** approved / (approved + dismissed); null when nothing recorded yet */
  approvalRate: number | null;
  grantedTools: string[];
  lastApprovedAt: string | null;
  lastDismissedAt: string | null;
}

export async function getPlaybookApprovalRates(
  workspaceId: string
): Promise<PlaybookApprovalRate[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("playbook_action_approvals")
    .select(
      "playbook_slug, tool_slug, approved_count, dismissed_count, autonomy_granted_at, last_approved_at, last_dismissed_at"
    )
    .eq("workspace_id", workspaceId);

  const byPlaybook = new Map<string, PlaybookApprovalRate>();
  for (const row of data ?? []) {
    const slug = row.playbook_slug;
    const entry = byPlaybook.get(slug) ?? {
      playbookSlug: slug,
      approvedCount: 0,
      dismissedCount: 0,
      approvalRate: null,
      grantedTools: [],
      lastApprovedAt: null,
      lastDismissedAt: null,
    };
    entry.approvedCount += (row.approved_count as number | null) ?? 0;
    entry.dismissedCount += (row.dismissed_count as number | null) ?? 0;
    if (row.autonomy_granted_at) entry.grantedTools.push(row.tool_slug);
    const approvedAt = row.last_approved_at as string | null;
    const dismissedAt = row.last_dismissed_at as string | null;
    if (approvedAt && (!entry.lastApprovedAt || approvedAt > entry.lastApprovedAt)) {
      entry.lastApprovedAt = approvedAt;
    }
    if (dismissedAt && (!entry.lastDismissedAt || dismissedAt > entry.lastDismissedAt)) {
      entry.lastDismissedAt = dismissedAt;
    }
    byPlaybook.set(slug, entry);
  }

  const rates = [...byPlaybook.values()];
  for (const entry of rates) {
    const total = entry.approvedCount + entry.dismissedCount;
    entry.approvalRate = total > 0 ? entry.approvedCount / total : null;
  }
  return rates.sort((a, b) => a.playbookSlug.localeCompare(b.playbookSlug));
}

/**
 * Offer when the count lands on a threshold multiple and autonomy is not
 * already granted. A decline suppresses re-offers until the next multiple.
 * An open (still queued) offer run dedups concurrent threshold crossings.
 *
 * Rate gate: a step the user dismisses more often than approves is telling
 * us the playbook is wrong for them, not that the gate should relax — no
 * offer, regardless of where the approval count sits.
 */
async function maybeCreateAutonomyOffer(input: {
  workspaceId: string;
  playbookSlug: string;
  toolSlug: string;
  row: ApprovalRow | null;
  newCount: number;
}): Promise<void> {
  const { workspaceId, playbookSlug, toolSlug, row, newCount } = input;

  if (newCount % EARNED_AUTONOMY_THRESHOLD !== 0) return;
  if (row?.autonomy_granted_at) return;
  if ((row?.dismissed_count ?? 0) > newCount) return;

  const admin = createAdminClient();

  const { data: openOffer } = await admin
    .from("play_runs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("state", "queued")
    .eq("trigger_evidence->>kind", AUTONOMY_OFFER_KIND)
    .eq("source_context->>playbook_slug", playbookSlug)
    .eq("trigger_evidence->>tool_slug", toolSlug)
    .limit(1)
    .maybeSingle();

  if (openOffer) return;

  const times = newCount;
  const { error } = await admin.from("play_runs").insert({
    workspace_id: workspaceId,
    state: "queued",
    title: "Let Salt handle this automatically?",
    preview: `You've approved this step ${times} times. Salt can run ${formatToolSlugForHumans(toolSlug)} without asking next time — you can turn it off anytime in Settings → Plays.`,
    trigger_source: "system",
    source_context: buildPlaybookSourceContext({ playbookSlug }),
    trigger_evidence: {
      kind: AUTONOMY_OFFER_KIND,
      tool_slug: toolSlug,
      approved_count: times,
    } as Json,
  });

  if (error) {
    console.warn(
      `[earned-autonomy] failed to create offer for ${playbookSlug}/${toolSlug}: ${error.message}`
    );
    return;
  }

  await admin
    .from("playbook_action_approvals")
    .update({ autonomy_offered_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("playbook_slug", playbookSlug)
    .eq("tool_slug", toolSlug);
}

/**
 * Grant autonomy (user approved the offer). Future steps run without asking.
 */
export async function grantAutonomy(
  workspaceId: string,
  playbookSlug: string,
  toolSlug: string
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("playbook_action_approvals")
    .update({
      autonomy_granted_at: new Date().toISOString(),
      autonomy_declined_at: null,
    })
    .eq("workspace_id", workspaceId)
    .eq("playbook_slug", playbookSlug)
    .eq("tool_slug", toolSlug);
}

/**
 * Decline the current offer. The gate keeps asking; the offer re-appears
 * after another EARNED_AUTONOMY_THRESHOLD approvals.
 */
export async function declineAutonomyOffer(
  workspaceId: string,
  playbookSlug: string,
  toolSlug: string
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("playbook_action_approvals")
    .update({ autonomy_declined_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("playbook_slug", playbookSlug)
    .eq("tool_slug", toolSlug);
}

/**
 * Revoke a grant (Settings → Plays). The step immediately returns to asking;
 * the approval count is kept so a fresh offer arrives at the next multiple.
 */
export async function revokeAutonomy(
  workspaceId: string,
  playbookSlug: string,
  toolSlug: string
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("playbook_action_approvals")
    .update({ autonomy_granted_at: null })
    .eq("workspace_id", workspaceId)
    .eq("playbook_slug", playbookSlug)
    .eq("tool_slug", toolSlug);
}

export interface AutonomyGrant {
  playbookSlug: string;
  toolSlug: string;
  approvedCount: number;
  grantedAt: string;
}

/**
 * Active grants for Settings → Plays. Uses the workspace-scoped server client
 * so RLS enforces membership.
 */
export async function listAutonomyGrants(
  workspaceId: string
): Promise<AutonomyGrant[]> {
  const { createClient } = await import("@/app/_lib/supabase/server");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("playbook_action_approvals")
    .select(
      "playbook_slug, tool_slug, approved_count, autonomy_granted_at"
    )
    .eq("workspace_id", workspaceId)
    .not("autonomy_granted_at", "is", null)
    .order("autonomy_granted_at", { ascending: false });

  if (error) {
    console.warn(`[earned-autonomy] failed to list grants: ${error.message}`);
    return [];
  }

  return (data ?? []).map((row) => ({
    playbookSlug: row.playbook_slug as string,
    toolSlug: row.tool_slug as string,
    approvedCount: (row.approved_count as number) ?? 0,
      grantedAt: row.autonomy_granted_at as string,
  }));
}
