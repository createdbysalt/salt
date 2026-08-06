/**
 * Resume a playbook that paused at an approval gate.
 *
 * When a playbook reaches a step marked `approval: required` — or a tool that
 * needs confirmation in Trust mode — execution stops and the run is parked with
 * `paused_for_approval: true` and the pending call in `approval_context`.
 * Approving it must run *that* call.
 *
 * Until 2026-08-05 this path executed nothing. It flipped the run to `ran` and
 * wrote "Approved and executed: <slug>" to the activity feed while the tool was
 * never invoked, so a user who approved a paused send saw a success state for an
 * email that was never sent. That is the worst failure available to an approval
 * product: it does not surface as an error, it silently breaks the promise the
 * approval was asking about.
 *
 * Dependencies are injected so the execution path can be tested without Supabase
 * or a live connector — the same shape `run-play.ts` uses.
 */

/** The pending call recorded when the playbook paused. */
export interface PlaybookApprovalContext {
  tool_slug: string;
  args: Record<string, unknown>;
  step_index: number;
}

export interface ResumePausedPlaybookRun {
  id: string;
  title: string;
  approvalContext: PlaybookApprovalContext | null;
}

export interface ResumePausedPlaybookDeps {
  loadRun(runId: string, workspaceId: string): Promise<ResumePausedPlaybookRun | null>;
  /**
   * Move the run to `executing`, returning false if another caller got there
   * first. This is what stops a double-approval from sending twice.
   */
  claimRun(runId: string, workspaceId: string): Promise<boolean>;
  executeTool(
    toolSlug: string,
    args: Record<string, unknown>,
    context: { workspaceId: string; actorUserId: string; approvedActions: readonly string[] },
  ): Promise<unknown>;
  finalizeRun(
    runId: string,
    workspaceId: string,
    patch: Record<string, unknown>,
  ): Promise<void>;
  recordActivity(entry: {
    workspaceId: string;
    playRunId: string;
    userId: string;
    action: string;
    title: string;
    detail: string;
  }): Promise<void>;
  /** Bills the run. Called only after the tool actually returned. */
  meterExecution(
    workspaceId: string,
    playRunId: string,
    toolSlugs: string[],
  ): Promise<void>;
  now(): string;
}

export type ResumePausedPlaybookResult =
  | { ok: true }
  | { ok: false; error: string };

export async function resumePausedPlaybook(
  input: { playRunId: string; workspaceId: string; userId: string },
  deps: ResumePausedPlaybookDeps,
): Promise<ResumePausedPlaybookResult> {
  const { playRunId, workspaceId, userId } = input;

  const run = await deps.loadRun(playRunId, workspaceId);
  if (!run) {
    return { ok: false, error: "Play run not found" };
  }

  const approval = run.approvalContext;
  if (!approval?.tool_slug) {
    return { ok: false, error: "No approval context found" };
  }

  // Claim before executing. Approval is reachable from two devices and a
  // double-click, and the side effect here is an irreversible external send.
  const claimed = await deps.claimRun(playRunId, workspaceId);
  if (!claimed) {
    return { ok: false, error: "Play run is already executing or finished" };
  }

  try {
    // Consent is exactly the slug the gate asked about — nothing wider. The
    // policy gate in `executeComposioAction` refuses anything outside this list.
    await deps.executeTool(approval.tool_slug, approval.args ?? {}, {
      workspaceId,
      actorUserId: userId,
      approvedActions: [approval.tool_slug],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to execute approved step";

    // `failed`, not back to `approved`: a retry would re-send, and the call may
    // have landed before the error. A human decides whether to run it again.
    const failedAt = deps.now();
    await deps.finalizeRun(playRunId, workspaceId, {
      state: "failed",
      last_error: message,
      paused_for_approval: false,
      updated_at: failedAt,
    });
    await deps.recordActivity({
      workspaceId,
      playRunId,
      userId,
      action: "logged",
      title: run.title,
      detail: `Approved step failed: ${approval.tool_slug} — ${message}`,
    });

    // Not metered, matching the executor: no external effect means no bill.
    return { ok: false, error: message };
  }

  const ranAt = deps.now();
  await deps.finalizeRun(playRunId, workspaceId, {
    paused_for_approval: false,
    paused_at_step: null,
    state: "ran",
    ran_at: ranAt,
    updated_at: ranAt,
  });

  await deps.recordActivity({
    workspaceId,
    playRunId,
    userId,
    action: "resumed",
    title: run.title,
    detail: `Approved and executed: ${approval.tool_slug}`,
  });

  // Carries the real slug, so a resumed approval that sends an email bills as
  // a billable play. Metering the run without it billed every one as free.
  await deps.meterExecution(workspaceId, playRunId, [approval.tool_slug]);

  return { ok: true };
}
