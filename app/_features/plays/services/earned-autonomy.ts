import "server-only";

/**
 * Earned autonomy (GROW): per-(workspace, playbook, tool) approval counter.
 *
 * Playbook action steps marked `needsApproval: true` pause for human
 * approval until the workspace has approved that exact playbook+tool
 * combination EARNED_AUTONOMY_THRESHOLD times — then the step runs
 * silently. Steps marked `approval: required` are never earned away
 * (hard gates stay hard).
 *
 * The counter is bumped only when an approval actually executes
 * (resume path), never on the pause itself.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

export const EARNED_AUTONOMY_THRESHOLD = 10;

/**
 * True when the workspace has approved this playbook+tool combination often
 * enough that the step no longer needs a human in the loop.
 */
export async function hasEarnedAutonomy(
  workspaceId: string,
  playbookSlug: string,
  toolSlug: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("playbook_action_approvals")
    .select("approved_count")
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

  return (data?.approved_count ?? 0) >= EARNED_AUTONOMY_THRESHOLD;
}

/**
 * Record one executed approval for a playbook+tool combination.
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
    .select("id, approved_count")
    .eq("workspace_id", workspaceId)
    .eq("playbook_slug", playbookSlug)
    .eq("tool_slug", toolSlug)
    .maybeSingle();

  if (existing) {
    await admin
      .from("playbook_action_approvals")
      .update({
        approved_count: (existing.approved_count ?? 0) + 1,
        last_approved_at: now,
      })
      .eq("id", existing.id);
    return;
  }

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
  } else if (error) {
    console.warn(
      `[earned-autonomy] failed to record approval for ${playbookSlug}/${toolSlug}: ${error.message}`
    );
  }
}
