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

import { inboxSendToolFor, isInboxDraftTool } from "../lib/artifact-links";
import {
  getEmailProviderCapability,
  getProviderForSendTool,
  isSendEmailTool,
} from "@/app/_lib/composio/capability-config";
import {
  applyPreparedInboxDraftArgs,
  type DraftSender,
} from "../lib/draft-preview";
import {
  collectPayLinksFromSources,
  type DraftPayLink,
} from "../lib/draft-payment-link";
import { remapEmailToolArgs } from "../lib/playbook-email-slot";
import {
  MEMORY_NOTE_TOOL_SLUG,
  type MemoryNoteWrite,
} from "./write-memory-note";

/** The pending call recorded when the playbook paused. */
export interface PlaybookApprovalContext {
  tool_slug: string;
  args: Record<string, unknown>;
  step_index: number;
  /** True after "Open in Gmail" already wrote this draft. */
  inbox_draft_written?: boolean;
  /**
   * memory_update outputs: when the run paused on an action step before the
   * output stage, the note to file rides along here and is written after the
   * approved action executes. One approval covers the card the user read.
   */
  memory_update?: MemoryNoteWrite;
}

export interface ResumePausedPlaybookRun {
  id: string;
  title: string;
  approvalContext: PlaybookApprovalContext | null;
  draftBody?: string | null;
  contextInputs?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  targetId?: string | null;
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
  /**
   * Email mode for a provider ("draft" | "send"). When a resolved send slug
   * belongs to a draft-mode provider, the resume falls back to the provider's
   * draft tool instead of throwing — the approval card already showed
   * "Create draft" (check-run-preconditions), so the click honors it.
   */
  loadEmailMode?(workspaceId: string, provider: string): Promise<"draft" | "send">;
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
  /**
   * Files a memory_update output note through the canonical note path.
   * Called for runs parked on the MEMORY_NOTE_TOOL_SLUG sentinel, and after
   * an approved action when a note rode along in approval_context.
   */
  writeMemoryNote?(
    workspaceId: string,
    note: MemoryNoteWrite,
  ): Promise<void>;
  now(): string;
  loadSender?(userId: string): Promise<DraftSender>;
  loadInvoicePayUrl?(
    workspaceId: string,
    targetId: string | null
  ): Promise<string | null>;
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

  const sendSlug = inboxSendToolFor(approval.tool_slug);
  const toolSlug = sendSlug ?? approval.tool_slug;
  // A memory_update output parked on the sentinel: no connector call, no
  // draft prep — approving the card files the note and nothing else.
  const isMemoryNoteWrite = approval.tool_slug === MEMORY_NOTE_TOOL_SLUG;
  let noteFiled = false;

  // Draft-mode fallback: the approval card previews "Create draft" when the
  // provider is in draft mode (check-run-preconditions), so the click must
  // create a draft — not throw the gate's draft-mode error after approval.
  let effectiveToolSlug = toolSlug;
  let draftFallbackProvider: string | null = null;
  if (!isMemoryNoteWrite && isSendEmailTool(toolSlug) && deps.loadEmailMode) {
    const provider = getProviderForSendTool(toolSlug);
    const mode = provider
      ? await deps.loadEmailMode(workspaceId, provider)
      : "send";
    if (mode !== "send" && provider) {
      const cap = getEmailProviderCapability(provider);
      if (cap?.draftTool) {
        effectiveToolSlug = cap.draftTool;
        draftFallbackProvider = cap.label;
      }
    }
  }

  try {
    if (isMemoryNoteWrite) {
      if (!deps.writeMemoryNote) {
        throw new Error("Memory note writes are not wired in this environment");
      }
      await deps.writeMemoryNote(workspaceId, {
        ...(approval.args as unknown as MemoryNoteWrite),
        sourceRef: `play_run:${playRunId}`,
      });
      noteFiled = true;
    } else {
      // Send means send. A review draft from Open in Gmail does not replace
      // the outbound email.
      const rawArgs = approval.args ?? {};
      const sender = (await deps.loadSender?.(userId)) ?? {};
      const extraUrl = await deps.loadInvoicePayUrl?.(workspaceId, run.targetId ?? null);
      const payLinks: DraftPayLink[] = collectPayLinksFromSources({
        invoiceContext: run.contextInputs?.invoice_context,
        artifacts: run.metadata?.artifacts,
        verifyText: run.contextInputs?.verify_unpaid,
        extraUrls: extraUrl ? [extraUrl] : [],
      });
      const prepared =
        sendSlug || isInboxDraftTool(approval.tool_slug)
          ? applyPreparedInboxDraftArgs(
              rawArgs,
              run.draftBody,
              sender,
              effectiveToolSlug,
              payLinks
            )
          : rawArgs;
      const args = sendSlug
        ? remapEmailToolArgs(approval.tool_slug, effectiveToolSlug, prepared)
        : prepared;
      // The Send click is consent to send, including when the gate first
      // paused on create-draft. In draft mode the click is consent to the
      // draft the card promised (draftFallbackProvider is set).
      await deps.executeTool(effectiveToolSlug, args, {
        workspaceId,
        actorUserId: userId,
        approvedActions: [effectiveToolSlug],
      });

      // The action landed. If a memory_update note rode along on the pause,
      // file it now — the approval covered the card that showed the review.
      // A note failure must not fail the run: the external effect already
      // happened and the note is recoverable.
      if (approval.memory_update && deps.writeMemoryNote) {
        try {
          await deps.writeMemoryNote(workspaceId, {
            ...approval.memory_update,
            sourceRef: `play_run:${playRunId}`,
          });
          noteFiled = true;
        } catch (noteError) {
          console.error(
            `[resume] memory note write failed after ${effectiveToolSlug} executed:`,
            noteError
          );
        }
      }
    }
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
    detail: isMemoryNoteWrite
      ? `Approved and filed note on ${(approval.args as { entityLabel?: string }).entityLabel ?? "record"}`
      : draftFallbackProvider
        ? `Draft created (${draftFallbackProvider} is in draft mode): ${effectiveToolSlug}${noteFiled ? " + note filed" : ""}`
        : `Approved and executed: ${effectiveToolSlug}${noteFiled ? " + note filed" : ""}`,
  });

  // A memory-note write has no external effect and no vendor spend — it is
  // not a billable play. Meter only real tool executions (a draft created
  // via the fallback is still a Composio call — meter the effective slug).
  if (!isMemoryNoteWrite) {
    await deps.meterExecution(workspaceId, playRunId, [effectiveToolSlug]);
  }

  return { ok: true };
}
