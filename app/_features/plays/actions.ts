"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { nextStateForAction } from "./utils/play-state-machine";
import { executePlayRun } from "./services/run-play";
import { createRunPlayDeps } from "./services/run-play-deps";
import { applyIntakePlayRun } from "./services/create-intake-play-run";
import { meterInternalPlay } from "./services/meter-play";
import { resumePausedPlaybook as resumePausedPlaybookService } from "./services/resume-paused-playbook";
import { createResumePausedPlaybookDeps } from "./services/resume-paused-playbook-deps";
import { dismissEvidence } from "@/app/_features/memory/evidence/actions";
import {
  approvePlaybookImprovementProposal,
  synthesizePlaybookImprovementProposal,
} from "./playbooks/learning/approve-proposal";
import {
  capturePlaybookLearningSignal,
  loadTemplateBlueprintMeta,
} from "./playbooks/learning/capture-signals";
import { captureVoiceCorrection } from "@/app/_features/me/actions/capture-voice-correction";
import type { PlayRunRow, PlayRunState } from "./types";
import type { ProfileFillRulesDocument, ProfilePlaybookSettings } from "./playbooks/records-engine/types";
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
    .eq("workspace_id", workspace.id)
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
    workspace_id: input.workspaceId,
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
    .eq("workspace_id", workspace.id)
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
    .eq("workspace_id", workspace.id)
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

  // Paused playbook path: resume execution from the approval gate
  if (run.paused_for_approval && run.approval_context) {
    const resumeResult = await resumePausedPlaybook(id, workspace.id, userId);
    revalidatePath("/hq");
    revalidatePath("/plays");
    if (resumeResult.ok) {
      // Earned autonomy (GROW): count the executed approval toward this
      // playbook+tool combination so the step eventually runs silently.
      const evidence = run.trigger_evidence as { playbook_slug?: string } | null;
      const approvalContext = run.approval_context as { tool_slug?: string } | null;
      if (evidence?.playbook_slug && approvalContext?.tool_slug) {
        const { recordActionApproval } = await import(
          "./services/earned-autonomy"
        );
        await recordActionApproval(
          workspace.id,
          evidence.playbook_slug,
          approvalContext.tool_slug
        ).catch((err) => {
          console.warn(
            "[plays] failed to record earned-autonomy approval:",
            err instanceof Error ? err.message : err
          );
        });
      }
      const { data: updatedRun } = await supabase
        .from("play_runs")
        .select("*")
        .eq("id", id)
        .single();
      return { ok: true, data: updatedRun as PlayRunRow };
    }
    return {
      ok: false,
      errorCode: "RESUME_FAILED",
      message: resumeResult.error ?? "Failed to resume playbook",
    };
  }

  // Acting path: a template with a compiled definition and recorded consent
  // executes for real; everything else stays the log-only draft-acceptance
  // path until Phase 2 consent UX ships.
  if (run.template_id) {
    const { data: template } = await supabase
      .from("play_templates")
      .select("definition, approved_actions, actions_approved_by, is_active")
      .eq("id", run.template_id)
      .eq("workspace_id", workspace.id)
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

  // Intake record path: create the Memory record from accumulated evidence
  const metadata = run.metadata as { intake_record?: boolean } | null;
  if (metadata?.intake_record) {
    const intakeResult = await applyIntakePlayRun(id);
    if (!intakeResult.ok) {
      return {
        ok: false,
        errorCode: "INTAKE_FAILED",
        message: intakeResult.error,
      };
    }

    await logActivity({
      workspaceId: workspace.id,
      playRunId: id,
      userId,
      action: "ran",
      title: run.title,
      detail: `Created record: ${intakeResult.recordId}`,
    });

    await meterInternalPlay(workspace.id, id);

    revalidatePath("/hq");
    revalidatePath("/plays");
    revalidatePath("/people");
    revalidatePath("/work");

    // Reload the updated play run
    const { data: updatedRun } = await supabase
      .from("play_runs")
      .select("*")
      .eq("id", id)
      .single();

    return { ok: true, data: updatedRun as PlayRunRow };
  }

  // Log-only completion (no compiled definition on this run's template).
  const { data, error } = await supabase
    .from("play_runs")
    .update({ state: "ran", ran_at: now, updated_at: now })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
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

  await meterInternalPlay(workspace.id, id);

  revalidatePath("/hq");
  revalidatePath("/plays");

  return { ok: true, data: data as PlayRunRow };
}

/**
 * Resume a playbook that paused at an approval gate.
 *
 * Thin wrapper: the logic lives in `services/resume-paused-playbook.ts` so the
 * execution path can be tested without Supabase or a live connector.
 *
 * Fixed 2026-08-05. This previously flipped the run to `ran` and logged
 * "Approved and executed: <slug>" without ever calling the tool, so approving
 * a paused send reported success for an email that was never sent.
 */
async function resumePausedPlaybook(
  playRunId: string,
  workspaceId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return resumePausedPlaybookService(
    { playRunId, workspaceId, userId },
    createResumePausedPlaybookDeps(),
  );
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

    // Dismiss underlying evidence for intake plays so it doesn't resurface
    const metadata = existing.metadata as { intake_record?: boolean } | null;
    if (metadata?.intake_record && existing.evidence_ids?.length) {
      const evidenceId = existing.evidence_ids[0];
      if (evidenceId) {
        await dismissEvidence(evidenceId, reason ?? "Dismissed from Plays queue");
      }
    }
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
    .eq("workspace_id", workspace.id)
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

  // Capture voice corrections to learn the user's writing preferences
  if (existing.draft_body) {
    void captureVoiceCorrection({
      workspaceId: workspace.id,
      userId,
      originalDraft: existing.draft_body,
      editedDraft: draftBody,
      channel: existing.channel,
      playRunId: id,
    });
  }

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

// ---------------------------------------------------------------------------
// Keeper play_run actions (Phase 2 — unified play_runs path)
// ---------------------------------------------------------------------------

/**
 * Apply a Keeper profile play_run — writes the profile field and marks as ran.
 *
 * This is the play_runs equivalent of applyKeeperProfileFinding. It reads the
 * profile field/value from play_run metadata and applies it to the person.
 */
export async function applyKeeperPlayRun(
  playRunId: string
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();

  const { data: run, error: fetchError } = await supabase
    .from("play_runs")
    .select("id, target_id, metadata, state, title")
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id)
    .single();

  if (fetchError || !run) {
    return { success: false, error: fetchError?.message ?? "Play not found" };
  }

  const meta = run.metadata as Record<string, unknown> | null;
  if (!meta?.keeper_profile) {
    return { success: false, error: "Not a Memory profile play" };
  }

  const personId = run.target_id as string | null;
  if (!personId) {
    return { success: false, error: "Play is not attached to a person" };
  }

  const field = meta.profile_field as string | undefined;
  if (!field) {
    return { success: false, error: "Missing profile field in metadata" };
  }

  // Import dynamically to avoid circular deps
  const { approveProfileFieldSuggestion } = await import(
    "@/app/_features/people/actions/profile-fields"
  );

  const applyResult = await approveProfileFieldSuggestion({
    personId,
    field: field as import("./playbooks/records-engine/types").PersonProfileFieldKey,
  });

  if (!applyResult.ok) {
    return { success: false, error: applyResult.message };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("play_runs")
    .update({ state: "ran", ran_at: now, approved_at: now, updated_at: now })
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logActivity({
    workspaceId: workspace.id,
    playRunId,
    userId,
    action: "ran",
    title: run.title as string,
    detail: `Applied ${field} = ${meta.profile_value}`,
  });

  await meterInternalPlay(workspace.id, playRunId);

  revalidatePath("/plays");
  revalidatePath("/hq");
  revalidatePath(`/people/${personId}`);

  return { success: true };
}

/**
 * Answer a Keeper question play_run — writes the chosen value and marks as ran.
 */
export async function answerKeeperQuestionPlayRun(
  playRunId: string,
  answer: string
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();

  const { data: run, error: fetchError } = await supabase
    .from("play_runs")
    .select("id, target_id, metadata, state, title")
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id)
    .single();

  if (fetchError || !run) {
    return { success: false, error: fetchError?.message ?? "Play not found" };
  }

  const meta = run.metadata as Record<string, unknown> | null;
  if (!meta?.keeper_question) {
    return { success: false, error: "Not a Memory question play" };
  }

  const personId = run.target_id as string | null;
  if (!personId) {
    return { success: false, error: "Play is not attached to a person" };
  }

  const field = meta.question_field as string | undefined;
  if (!field) {
    return { success: false, error: "Missing question field in metadata" };
  }

  // Import dynamically to avoid circular deps
  const { correctPersonProfileField } = await import(
    "@/app/_features/people/actions/profile-fields"
  );

  const applyResult = await correctPersonProfileField({
    personId,
    field: field as import("./playbooks/records-engine/types").PersonProfileFieldKey,
    value: answer,
  });

  if (!applyResult.ok) {
    return { success: false, error: applyResult.message };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("play_runs")
    .update({
      state: "ran",
      ran_at: now,
      approved_at: now,
      updated_at: now,
      metadata: { ...meta, answered_value: answer },
    })
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logActivity({
    workspaceId: workspace.id,
    playRunId,
    userId,
    action: "ran",
    title: run.title as string,
    detail: `Answered ${field} = ${answer}`,
  });

  await meterInternalPlay(workspace.id, playRunId);

  revalidatePath("/plays");
  revalidatePath("/hq");
  revalidatePath(`/people/${personId}`);

  return { success: true };
}

// ---------------------------------------------------------------------------
// Risk and Routing play_run actions (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Acknowledge a risk play_run — marks as reviewed without taking further action.
 *
 * The user has seen the risk signal and decided no immediate action is needed.
 */
export async function acknowledgeRiskPlayRun(
  playRunId: string
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();

  const { data: run, error: fetchError } = await supabase
    .from("play_runs")
    .select("id, metadata, state, title")
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id)
    .single();

  if (fetchError || !run) {
    return { success: false, error: fetchError?.message ?? "Play not found" };
  }

  const meta = run.metadata as Record<string, unknown> | null;
  if (meta?.play_card_kind !== "risk") {
    return { success: false, error: "Not a risk play" };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("play_runs")
    .update({ state: "ran", ran_at: now, approved_at: now, updated_at: now })
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logActivity({
    workspaceId: workspace.id,
    playRunId,
    userId,
    action: "acknowledged",
    title: run.title as string,
    detail: "Risk acknowledged — no immediate action taken",
  });

  await meterInternalPlay(workspace.id, playRunId);

  revalidatePath("/plays");
  revalidatePath("/hq");

  return { success: true };
}

/**
 * Route a routing play_run to a specific person or org.
 *
 * Creates the person/org if needed, then marks the routing play as resolved.
 */
export async function routePlayRunToProfile(
  playRunId: string,
  target: { type: "person" | "org"; id?: string; createName?: string }
): Promise<{ success: boolean; error?: string; targetId?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();

  const { data: run, error: fetchError } = await supabase
    .from("play_runs")
    .select("id, metadata, state, title, target_label")
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id)
    .single();

  if (fetchError || !run) {
    return { success: false, error: fetchError?.message ?? "Play not found" };
  }

  const meta = run.metadata as Record<string, unknown> | null;
  if (meta?.play_card_kind !== "routing") {
    return { success: false, error: "Not a routing play" };
  }

  let targetId = target.id;

  // Create new person/org if needed
  if (!targetId && target.createName) {
    if (target.type === "person") {
      const fromEmail = meta?.from_email as string | undefined;
      const { data: person, error: createError } = await supabase
        .from("people")
        .insert({
          workspace_id: workspace.id,
          name: target.createName,
          email: fromEmail ?? null,
        })
        .select("id")
        .single();

      if (createError || !person) {
        return { success: false, error: createError?.message ?? "Could not create person" };
      }
      targetId = person.id as string;
    } else {
      const { data: org, error: createError } = await supabase
        .from("organizations")
        .insert({
          workspace_id: workspace.id,
          name: target.createName,
        })
        .select("id")
        .single();

      if (createError || !org) {
        return { success: false, error: createError?.message ?? "Could not create organization" };
      }
      targetId = org.id as string;
    }
  }

  if (!targetId) {
    return { success: false, error: "No target specified" };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("play_runs")
    .update({
      state: "ran",
      ran_at: now,
      approved_at: now,
      updated_at: now,
      target_type: target.type,
      target_id: targetId,
      metadata: { ...meta, routed_to: targetId },
    })
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logActivity({
    workspaceId: workspace.id,
    playRunId,
    userId,
    action: "routed",
    title: run.title as string,
    detail: `Routed to ${target.type}: ${target.createName ?? targetId}`,
  });

  await meterInternalPlay(workspace.id, playRunId);

  revalidatePath("/plays");
  revalidatePath("/hq");
  revalidatePath(`/${target.type === "person" ? "people" : "orgs"}/${targetId}`);

  return { success: true, targetId };
}

// ---------------------------------------------------------------------------
// Auto-handled watermark (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Mark auto-handled items as "seen" by updating the workspace watermark.
 *
 * Items handled after this timestamp are considered "unreviewed" and will
 * appear in the Auto-handled view. Items before are considered reviewed.
 */
export async function markAutoHandledSeen(): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("workspaces")
    .update({ auto_handled_seen_at: now })
    .eq("id", workspace.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/plays");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Player Context (Phase 2.6)
// ---------------------------------------------------------------------------

export interface SavePlayerContextInput {
  playerSlug: string;
  domain_knowledge: string | null;
  tone_preferences: string | null;
  workflow_preferences: string | null;
  context_doc: string | null;
}

/**
 * Save or update player context for a workspace.
 */
export async function savePlayerContext(
  input: SavePlayerContextInput,
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const supabase = await createClient();

  const { error } = await supabase
    .from("player_context")
    .upsert(
      {
        workspace_id: workspace.id,
        player_slug: input.playerSlug,
        domain_knowledge: input.domain_knowledge,
        tone_preferences: input.tone_preferences,
        workflow_preferences: input.workflow_preferences,
        context_doc: input.context_doc,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,player_slug" },
    );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/plays");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Play Feedback (LEARN → ACT → GROW)
// ---------------------------------------------------------------------------

export type PlayFeedback = "positive" | "negative";

/**
 * Submit feedback on an auto-handled play.
 *
 * Part of the GROW loop — feedback calibrates confidence thresholds over time.
 * Negative feedback triggers playbook evolution analysis.
 */
export async function submitPlayFeedback(
  playRunId: string,
  feedback: PlayFeedback,
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();

  const { data: run, error: fetchError } = await supabase
    .from("play_runs")
    .select("id, title, queue, stakes, confidence, metadata")
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id)
    .single();

  if (fetchError || !run) {
    return { success: false, error: fetchError?.message ?? "Play not found" };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("play_runs")
    .update({
      user_feedback: feedback,
      user_feedback_at: now,
      updated_at: now,
    })
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logActivity({
    workspaceId: workspace.id,
    playRunId,
    userId,
    action: "logged",
    title: run.title as string,
    detail: feedback === "positive" ? "Marked as helpful" : "Marked as unhelpful",
  });

  revalidatePath("/plays");
  return { success: true };
}

// ============================================================================
// Trust Layer Actions
// ============================================================================

export async function resolveConflictAction(input: {
  conflictId: string;
  resolutionValue: unknown;
}): Promise<{ success: boolean; error?: string }> {
  const { resolveConflict } = await import("@/app/_lib/memory-tools");

  try {
    await resolveConflict({
      conflictId: input.conflictId,
      resolvedBy: "user",
      resolutionValue: input.resolutionValue,
    });

    revalidatePath("/plays/trust");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Undo Actions
// ============================================================================

/**
 * Undo an auto-applied action.
 *
 * This marks the play as dismissed and logs the undo action.
 * For Memory profile updates, it also marks the provenance as reverted.
 * The user can then manually correct the field if needed.
 */
export async function undoAutoAppliedAction(
  activityEntryId: string,
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();

  // Get the activity entry
  const { data: entry, error: entryError } = await supabase
    .from("activity_entries")
    .select("id, play_run_id, action, title, metadata")
    .eq("id", activityEntryId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (entryError || !entry) {
    return { success: false, error: "Activity entry not found" };
  }

  // Check if this was an auto-applied action
  const meta = entry.metadata as Record<string, unknown> | null;
  if (entry.action !== "auto_applied" && meta?.auto_executed !== true) {
    return { success: false, error: "This action cannot be undone — it was not auto-applied" };
  }

  const playRunId = entry.play_run_id;

  // If there's an associated play run, mark it as dismissed
  if (playRunId) {
    const { error: updateError } = await supabase
      .from("play_runs")
      .update({
        state: "dismissed",
        dismissed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...(meta ?? {}),
          undone_at: new Date().toISOString(),
          undone_by: userId,
        },
      })
      .eq("id", playRunId)
      .eq("workspace_id", workspace.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // If this was a keeper profile update, mark provenance as reverted
    if (meta?.field && meta?.entity_id) {
      const { createAdminClient } = await import("@/app/_lib/supabase/admin");
      const admin = createAdminClient();

      await admin
        .from("profile_field_provenance")
        .update({
          status: "reverted",
          evidence: {
            reverted_at: new Date().toISOString(),
            reverted_by: userId,
          },
        })
        .eq("workspace_id", workspace.id)
        .eq("entity_id", meta.entity_id as string)
        .eq("field", meta.field as string)
        .eq("status", "applied")
        .order("set_at", { ascending: false })
        .limit(1);
    }
  }

  // Log the undo action
  await logActivity({
    workspaceId: workspace.id,
    playRunId: playRunId ?? "",
    userId,
    action: "dismissed",
    title: `Undid: ${entry.title}`,
    detail: "You reverted this auto-applied action",
    metadata: {
      original_entry_id: activityEntryId,
      original_action: entry.action,
    },
  });

  revalidatePath("/plays");
  revalidatePath("/hq");

  return { success: true };
}
