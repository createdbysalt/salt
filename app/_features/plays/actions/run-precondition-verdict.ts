"use server";

/**
 * Gate preview for the approval card — read-only.
 *
 * Loads a paused run's pending tool from `approval_context`, resolves the
 * send slug the resume path will actually execute (draft gates remap to
 * send on approve), and returns the gate verdict the card renders before
 * the click. Returns `null` for runs that aren't paused on a tool.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type { ActionResult } from "../actions";
import { inboxSendToolFor } from "../lib/artifact-links";
import {
  checkRunPreconditions,
  type RunPreconditionVerdict,
} from "../services/check-run-preconditions";
import type { PlaybookApprovalContext } from "../services/resume-paused-playbook";

export async function getRunPreconditionVerdict(
  playRunId: string
): Promise<ActionResult<RunPreconditionVerdict | null>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  if (!context.userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("play_runs")
    .select("id, paused_for_approval, approval_context")
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!data || data.paused_for_approval !== true) {
    return { ok: true, data: null };
  }

  const approval = (data.approval_context as PlaybookApprovalContext | null) ?? null;
  if (!approval?.tool_slug) {
    return { ok: true, data: null };
  }

  // Mirror the resume path's resolution: a paused draft gate sends on approve.
  const resolvedSlug = inboxSendToolFor(approval.tool_slug) ?? approval.tool_slug;

  const verdict = await checkRunPreconditions({
    workspaceId: workspace.id,
    toolSlug: resolvedSlug,
    targetLabel: approval.memory_update?.entityLabel ?? null,
  });

  return { ok: true, data: verdict };
}
