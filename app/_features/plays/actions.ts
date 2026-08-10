"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { nextStateForAction } from "./utils/play-state-machine";
import { meterInternalPlay } from "./services/meter-play";
import { resumePausedPlaybook as resumePausedPlaybookService } from "./services/resume-paused-playbook";
import { createResumePausedPlaybookDeps } from "./services/resume-paused-playbook-deps";
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
  // "blocked" is claimable: a run paused by a toolkit reconnect, pacing
  // guard, or exhausted bundle re-enters here once the cause is fixed.
  const { data: claimed } = await supabase
    .from("play_runs")
    .update({ state: "approved", approved_at: now, updated_at: now })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .in("state", ["queued", "draft", "approved", "scheduled", "blocked"])
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

  // Earned-autonomy offer: approving grants autonomy for the playbook+tool;
  // nothing executes beyond the grant itself.
  const offerEvidence = run.trigger_evidence as {
    kind?: string;
    tool_slug?: string;
  } | null;
  const offerSlug = (run.source_context as { playbook_slug?: string } | null)
    ?.playbook_slug;
  if (
    offerEvidence?.kind === "autonomy_offer" &&
    offerSlug &&
    offerEvidence.tool_slug
  ) {
    const { grantAutonomy } = await import("./services/earned-autonomy");
    await grantAutonomy(workspace.id, offerSlug, offerEvidence.tool_slug);
    const { data: updatedRun } = await supabase
      .from("play_runs")
      .update({ state: "ran", ran_at: now, updated_at: now })
      .eq("id", id)
      .select("*")
      .single();
    await logActivity({
      workspaceId: workspace.id,
      playRunId: id,
      userId,
      action: "autonomy_granted",
      title: run.title,
      detail: `Autonomy granted: ${offerSlug} / ${offerEvidence.tool_slug}`,
    });
    revalidatePath("/hq");
    revalidatePath("/plays");
    return { ok: true, data: updatedRun as PlayRunRow };
  }

  // Paused playbook path: resume execution from the approval gate
  if (run.paused_for_approval && run.approval_context) {
    const resumeResult = await resumePausedPlaybook(id, workspace.id, userId);
    revalidatePath("/hq");
    revalidatePath("/plays");
    if (resumeResult.ok) {
      // Earned autonomy (GROW): count the executed approval toward this
      // playbook+tool combination so the step eventually runs silently.
      // Attribution canonically lives in source_context.playbook_slug;
      // trigger_evidence is a fallback for paused runs written before
      // 2026-08-07 that are still in flight.
      const sourceContext = run.source_context as { playbook_slug?: string } | null;
      const evidence = run.trigger_evidence as { playbook_slug?: string } | null;
      const playbookSlug = sourceContext?.playbook_slug ?? evidence?.playbook_slug;
      const approvalContext = run.approval_context as { tool_slug?: string } | null;
      if (playbookSlug && approvalContext?.tool_slug) {
        const { recordActionApproval } = await import(
          "./services/earned-autonomy"
        );
        await recordActionApproval(
          workspace.id,
          playbookSlug,
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

  // Legacy template runs (template_id set) fall through to the log-only
  // path below — the v1 template executor was retired with the
  // play_templates table. (The intake-record approve path was retired
  // 2026-08-08 with plays canon Phase 2: record proposals live in Memory →
  // Filter Watching, never the queue; historical intake rows were dismissed
  // by migration 20260808040000.)

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
  // Dismissing an autonomy offer declines it — the gate keeps asking and the
  // offer re-appears after another threshold of approvals.
  const existing = await loadPlayRun(id);
  const result = await transitionPlayRun(id, "dismiss", { dismiss_reason: reason });

  if (result.ok && existing) {
    const evidence = existing.trigger_evidence as {
      kind?: string;
      tool_slug?: string;
    } | null;
    const slug = (existing.source_context as { playbook_slug?: string } | null)
      ?.playbook_slug;
    if (evidence?.kind === "autonomy_offer" && slug && evidence.tool_slug) {
      const { context } = await getTenantContext();
      const workspace = requireWorkspaceMember(context);
      const { declineAutonomyOffer } = await import(
        "./services/earned-autonomy"
      );
      await declineAutonomyOffer(workspace.id, slug, evidence.tool_slug).catch(
        (err) => {
          console.warn(
            "[plays] failed to record autonomy-offer decline:",
            err instanceof Error ? err.message : err
          );
        }
      );
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

  // Capture voice corrections to learn the user's writing preferences
  if (existing.draft_body) {
    void captureVoiceCorrection({
      workspaceId: workspace.id,
      originalDraft: existing.draft_body,
      editedDraft: draftBody,
      channel: existing.channel,
      playRunId: id,
    });
  }

  revalidatePath("/plays");
  return { ok: true, data: data as PlayRunRow };
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
// Memory Care play_run actions (Phase 2 — unified play_runs path)
// ---------------------------------------------------------------------------

/**
 * Apply a Memory Care profile play_run — writes the profile field and marks as ran.
 *
 * This is the play_runs equivalent of applyMemoryCareProfileFinding. It reads the
 * profile field/value from play_run metadata and applies it to the person.
 */
export async function applyMemoryCarePlayRun(
  playRunId: string
): Promise<ActionResult<void>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "unauthorized", message: "Sign in required" };
  }

  const supabase = await createClient();

  const { data: run, error: fetchError } = await supabase
    .from("play_runs")
    .select("id, target_id, metadata, state, title")
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id)
    .single();

  if (fetchError || !run) {
    return { ok: false, errorCode: "not_found", message: fetchError?.message ?? "Play not found" };
  }

  const meta = run.metadata as Record<string, unknown> | null;
  // Accepts the retired `keeper_profile` metadata key as a legacy fallback.
  if (!meta?.memory_care_profile && !meta?.keeper_profile) {
    return { ok: false, errorCode: "wrong_play_kind", message: "Not a Memory profile play" };
  }

  const personId = run.target_id as string | null;
  if (!personId) {
    return { ok: false, errorCode: "missing_target", message: "Play is not attached to a person" };
  }

  const field = meta.profile_field as string | undefined;
  if (!field) {
    return { ok: false, errorCode: "invalid_metadata", message: "Missing profile field in metadata" };
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
    return { ok: false, errorCode: "apply_failed", message: applyResult.message };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("play_runs")
    .update({ state: "ran", ran_at: now, approved_at: now, updated_at: now })
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return { ok: false, errorCode: "update_failed", message: updateError.message };
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

  return { ok: true, data: undefined };
}

/**
 * Answer a Memory Care question play_run — writes the chosen value and marks as ran.
 */
export async function answerMemoryCareQuestionPlayRun(
  playRunId: string,
  answer: string
): Promise<ActionResult<void>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;
  if (!userId) {
    return { ok: false, errorCode: "unauthorized", message: "Sign in required" };
  }

  const supabase = await createClient();

  const { data: run, error: fetchError } = await supabase
    .from("play_runs")
    .select("id, target_id, metadata, state, title")
    .eq("id", playRunId)
    .eq("workspace_id", workspace.id)
    .single();

  if (fetchError || !run) {
    return { ok: false, errorCode: "not_found", message: fetchError?.message ?? "Play not found" };
  }

  const meta = run.metadata as Record<string, unknown> | null;
  // Accepts the retired `keeper_question` metadata key as a legacy fallback.
  if (!meta?.memory_care_question && !meta?.keeper_question) {
    return { ok: false, errorCode: "wrong_play_kind", message: "Not a Memory question play" };
  }

  const personId = run.target_id as string | null;
  if (!personId) {
    return { ok: false, errorCode: "missing_target", message: "Play is not attached to a person" };
  }

  const field = meta.question_field as string | undefined;
  if (!field) {
    return { ok: false, errorCode: "invalid_metadata", message: "Missing question field in metadata" };
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
    return { ok: false, errorCode: "apply_failed", message: applyResult.message };
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
    return { ok: false, errorCode: "update_failed", message: updateError.message };
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

  return { ok: true, data: undefined };
}

// acknowledgeRiskPlayRun / routePlayRunToProfile were removed 2026-08-08
// (plays canon Phase 2): they served the retired client-risk / route-signal
// play_runs, were never wired to any UI, and their creators are gone —
// risk findings live in intelligence_findings, routing lives in the
// capture admission pipeline.

// ---------------------------------------------------------------------------
// Auto-handled watermark (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Mark auto-handled items as "seen" by updating the workspace watermark.
 *
 * Items handled after this timestamp are considered "unreviewed" and will
 * appear in the Auto-handled view. Items before are considered reviewed.
 */
export async function markAutoHandledSeen(): Promise<ActionResult<void>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("workspaces")
    .update({ auto_handled_seen_at: now })
    .eq("id", workspace.id);

  if (error) {
    return { ok: false, errorCode: "update_failed", message: error.message };
  }

  revalidatePath("/plays");
  return { ok: true, data: undefined };
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

    // If this was a Memory Care profile update, mark provenance as reverted
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
