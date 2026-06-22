"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { nextStateForAction } from "./utils/play-state-machine";
import { executePlayRun } from "./services/run-play";
import { createRunPlayDeps } from "./services/run-play-deps";
import { adoptPlaybookBlueprint } from "./playbooks/adopt-blueprint";
import {
  approvePlaybookImprovementProposal,
  synthesizePlaybookImprovementProposal,
} from "./playbooks/learning/approve-proposal";
import {
  capturePlaybookLearningSignal,
  loadTemplateBlueprintMeta,
} from "./playbooks/learning/capture-signals";
import type { PlayRunRow, PlayRunState, PlayTemplateRow } from "./types";
import type { ProfileFillRulesDocument, ProfilePlaybookSettings } from "./playbooks/profile/types";
import { getProfileBlueprintDetail, getProfilePlaybookSettings } from "./queries";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string };

async function loadPlayRun(id: string): Promise<PlayRunRow | null> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("play_runs")
    .select("*")
    .eq("id", id)
    .eq("studio_id", workspace.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as PlayRunRow;
}

async function logActivity(input: {
  workspaceId: string;
  playRunId: string;
  userId: string;
  action: string;
  title: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("activity_entries").insert({
    studio_id: input.workspaceId,
    play_run_id: input.playRunId,
    actor_user_id: input.userId,
    action: input.action,
    title: input.title,
    detail: input.detail ?? null,
    metadata: input.metadata ?? {},
  });
}

async function transitionPlayRun(
  id: string,
  action: "approve" | "dismiss" | "schedule" | "mark_ran",
  extra?: { scheduled_for?: string; draft_body?: string; dismiss_reason?: string },
): Promise<ActionResult<PlayRunRow>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const existing = await loadPlayRun(id);
  if (!existing) {
    return { ok: false, errorCode: "NOT_FOUND", message: "Play not found" };
  }

  let nextState: PlayRunState;
  try {
    nextState = nextStateForAction(action, existing.state);
  } catch (error) {
    return {
      ok: false,
      errorCode: "INVALID_TRANSITION",
      message: error instanceof Error ? error.message : "Invalid transition",
    };
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    state: nextState,
    updated_at: now,
  };

  if (action === "approve") patch.approved_at = now;
  if (action === "dismiss") patch.dismissed_at = now;
  if (action === "mark_ran") patch.ran_at = now;
  if (action === "schedule" && extra?.scheduled_for) {
    patch.scheduled_for = extra.scheduled_for;
  }
  if (extra?.draft_body !== undefined) {
    patch.draft_body = extra.draft_body;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("play_runs")
    .update(patch)
    .eq("id", id)
    .eq("studio_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      errorCode: "UPDATE_FAILED",
      message: error?.message ?? "Could not update play",
    };
  }

  await logActivity({
    workspaceId: workspace.id,
    playRunId: id,
    userId,
    action,
    title: existing.title,
    detail: action === "dismiss" ? extra?.dismiss_reason : undefined,
    // GROW substrate: structured dismissal reasons feed the nightly learning
    // classifier (see plan Addendum B).
    metadata:
      action === "dismiss" && extra?.dismiss_reason
        ? { dismiss_reason: extra.dismiss_reason }
        : undefined,
  });

  revalidatePath("/hq");
  revalidatePath("/plays");

  return { ok: true, data: data as PlayRunRow };
}

export async function approvePlayRun(id: string): Promise<ActionResult<PlayRunRow>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();

  // Atomic claim: the state filter inside the UPDATE makes double-click /
  // two-device approvals race-safe — exactly one caller gets the row.
  const { data: claimed } = await supabase
    .from("play_runs")
    .update({ state: "approved", approved_at: now, updated_at: now })
    .eq("id", id)
    .eq("studio_id", workspace.id)
    .in("state", ["queued", "draft", "approved", "scheduled"])
    .select("*")
    .maybeSingle();

  if (!claimed) {
    const existing = await loadPlayRun(id);
    if (!existing) {
      return { ok: false, errorCode: "NOT_FOUND", message: "Play not found" };
    }
    return {
      ok: false,
      errorCode: "INVALID_TRANSITION",
      message: `Cannot approve play in state ${existing.state}`,
    };
  }
  const run = claimed as PlayRunRow;

  await logActivity({
    workspaceId: workspace.id,
    playRunId: id,
    userId,
    action: "approved",
    title: run.title,
  });

  // Acting path: a template with a compiled definition and recorded consent
  // executes for real; everything else stays the log-only draft-acceptance
  // path until Phase 2 consent UX ships.
  if (run.template_id) {
    const { data: template } = await supabase
      .from("play_templates")
      .select("definition, approved_actions, actions_approved_by, is_active")
      .eq("id", run.template_id)
      .eq("studio_id", workspace.id)
      .maybeSingle();

    if (template?.definition) {
      const result = await executePlayRun(id, workspace.id, createRunPlayDeps());
      revalidatePath("/hq");
      revalidatePath("/plays");
      if (result.ok) {
        return { ok: true, data: result.run };
      }
      return {
        ok: false,
        errorCode: result.code,
        message: result.message,
      };
    }
  }

  // Log-only completion (no compiled definition on this run's template).
  const { data, error } = await supabase
    .from("play_runs")
    .update({ state: "ran", ran_at: now, updated_at: now })
    .eq("id", id)
    .eq("studio_id", workspace.id)
    .eq("state", "approved")
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      errorCode: "UPDATE_FAILED",
      message: error?.message ?? "Could not approve play",
    };
  }

  await logActivity({
    workspaceId: workspace.id,
    playRunId: id,
    userId,
    action: "ran",
    title: run.title,
    detail: "Approved (logged — this play has no pre-approved actions to execute)",
  });

  revalidatePath("/hq");
  revalidatePath("/plays");

  return { ok: true, data: data as PlayRunRow };
}

export async function dismissPlayRun(
  id: string,
  reason?: string,
): Promise<ActionResult<PlayRunRow>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const existing = await loadPlayRun(id);
  const result = await transitionPlayRun(id, "dismiss", { dismiss_reason: reason });

  if (result.ok && existing) {
    await recordPlaybookSignalForRun({
      workspaceId: workspace.id,
      playRun: existing,
      signalType: "dismissed",
      delta: { dismiss_reason: reason ?? null },
    });
  }

  return result;
}

export async function schedulePlayRun(
  id: string,
  scheduledFor: string,
): Promise<ActionResult<PlayRunRow>> {
  return transitionPlayRun(id, "schedule", { scheduled_for: scheduledFor });
}

export async function editPlayRun(
  id: string,
  draftBody: string,
): Promise<ActionResult<PlayRunRow>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  const existing = await loadPlayRun(id);
  if (!existing) {
    return { ok: false, errorCode: "NOT_FOUND", message: "Play not found" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("play_runs")
    .update({ draft_body: draftBody, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("studio_id", workspace.id)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      errorCode: "UPDATE_FAILED",
      message: error?.message ?? "Could not save edits",
    };
  }

  await logActivity({
    workspaceId: workspace.id,
    playRunId: id,
    userId,
    action: "edited",
    title: existing.title,
    metadata: {
      previous_body: existing.draft_body,
      new_body: draftBody,
      previous_length: existing.draft_body?.length ?? 0,
      new_length: draftBody.length,
    },
  });

  await recordPlaybookSignalForRun({
    workspaceId: workspace.id,
    playRun: existing,
    signalType: "edited",
    delta: {
      previous_body: existing.draft_body,
      new_body: draftBody,
      previous_length: existing.draft_body?.length ?? 0,
      new_length: draftBody.length,
    },
  });

  revalidatePath("/plays");
  return { ok: true, data: data as PlayRunRow };
}

async function recordPlaybookSignalForRun(input: {
  workspaceId: string;
  playRun: PlayRunRow;
  signalType: "edited" | "dismissed";
  delta: Record<string, unknown>;
}) {
  if (!input.playRun.template_id) return;

  const meta = await loadTemplateBlueprintMeta(
    input.playRun.template_id,
    input.workspaceId,
  );
  if (!meta?.blueprint_slug) return;

  await capturePlaybookLearningSignal({
    workspaceId: input.workspaceId,
    blueprintSlug: meta.blueprint_slug,
    templateId: input.playRun.template_id,
    playRunId: input.playRun.id,
    signalType: input.signalType,
    delta: input.delta,
  });
}

export async function adoptBlueprint(
  blueprintSlug: string,
): Promise<ActionResult<PlayTemplateRow>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  try {
    const { template } = await adoptPlaybookBlueprint({
      workspaceId: workspace.id,
      blueprintSlug,
    });

    revalidatePath("/plays");

    return { ok: true, data: template };
  } catch (error) {
    return {
      ok: false,
      errorCode: "ADOPT_FAILED",
      message: error instanceof Error ? error.message : "Could not adopt playbook",
    };
  }
}

export async function proposePlaybookImprovement(
  blueprintSlug: string,
): Promise<ActionResult<{ proposalId: string }>> {
  const { context } = await getTenantContext();
  requireWorkspaceMember(context);

  try {
    const result = await synthesizePlaybookImprovementProposal(blueprintSlug);
    if (!result) {
      return {
        ok: false,
        errorCode: "NO_PROPOSAL",
        message: "Not enough learning signals to propose an improvement yet",
      };
    }
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      errorCode: "PROPOSAL_FAILED",
      message: error instanceof Error ? error.message : "Could not synthesize proposal",
    };
  }
}

export async function approvePlaybookImprovement(
  proposalId: string,
): Promise<ActionResult<{ blueprintSlug: string; version: number }>> {
  const { context } = await getTenantContext();
  requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "UNAUTHORIZED", message: "Sign in required" };
  }

  try {
    const result = await approvePlaybookImprovementProposal({
      proposalId,
      reviewerUserId: userId,
    });
    revalidatePath("/plays");
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      errorCode: "APPROVE_FAILED",
      message: error instanceof Error ? error.message : "Could not approve improvement",
    };
  }
}

export async function fetchProfileBlueprintDetail(blueprintSlug: string): Promise<
  ActionResult<{
    fillRules: ProfileFillRulesDocument | null;
    settings: ProfilePlaybookSettings | null;
    procedureMd: string | null;
  }>
> {
  const { context } = await getTenantContext();
  requireWorkspaceMember(context);

  try {
    const [blueprint, settings] = await Promise.all([
      getProfileBlueprintDetail(blueprintSlug),
      getProfilePlaybookSettings(blueprintSlug),
    ]);

    if (!blueprint) {
      return { ok: false, errorCode: "NOT_FOUND", message: "Profile playbook not found" };
    }

    return {
      ok: true,
      data: {
        fillRules: blueprint.fillRules,
        settings,
        procedureMd: blueprint.procedureMd,
      },
    };
  } catch (error) {
    return {
      ok: false,
      errorCode: "FETCH_FAILED",
      message: error instanceof Error ? error.message : "Could not load profile playbook",
    };
  }
}
