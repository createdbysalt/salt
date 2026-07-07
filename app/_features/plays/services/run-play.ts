import type {
  OpportunityGapRow,
  PlayRunRow,
  PlayTemplateRow,
  PlayValueBasis,
  PlayValueKind,
} from "../types";
import {
  evaluateGuard,
  interpolateParams,
  renderTemplate,
  resolvePath,
  validatePlayDefinition,
  type PlayDefinition,
  type PlayLlmStep,
  type StepContext,
} from "../utils/play-definition";
import { capabilityAction } from "@/app/_lib/composio/capability-keys";

/**
 * Play-run executor — the acting engine (compiled-play model).
 *
 * Pure orchestrator: all I/O goes through RunPlayDeps so the contract is
 * unit-testable without a database or Composio. Production bindings live in
 * run-play-deps.ts (admin client — RLS is BYPASSED there, which is why every
 * dep takes workspaceId and the orchestrator re-reads consent/trust/kill
 * switch from the DB after claiming, never trusting a job payload).
 */

export interface RunPlayActivityEntry {
  action: "logged" | "ran" | "dismissed";
  title: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}

export interface RunPlayStepJournalEntry {
  index: number;
  kind: string;
  status: "completed" | "skipped";
  /** Bound value for fetch/render/llm steps so resumed runs can rebind. */
  boundValue?: unknown;
  externalId?: string;
  completedAt: string;
}

export interface RunPlayDeps {
  /** Atomic claim: approved/scheduled → executing. Null = lost the race or bad state. */
  claimRun(runId: string, workspaceId: string): Promise<PlayRunRow | null>;
  loadTemplate(templateId: string, workspaceId: string): Promise<PlayTemplateRow | null>;
  loadGap(gapId: string, workspaceId: string): Promise<OpportunityGapRow | null>;
  getWorkspaceTrustLevel(workspaceId: string): Promise<"read_only" | "act_with_approval">;
  /** Returns false when the write failed — callers must fail closed. */
  recordActivity(
    runId: string,
    workspaceId: string,
    entry: RunPlayActivityEntry,
  ): Promise<boolean>;
  executeTool(
    toolSlug: string,
    params: Record<string, unknown>,
    context: {
      workspaceId: string;
      actorUserId: string;
      approvedActions: readonly string[];
    },
  ): Promise<unknown>;
  /**
   * Resolve a capability step's intent to a concrete tool slug for this
   * workspace, or null when no connected/approved tool satisfies it (the step
   * then no-ops rather than failing). Tool-based steps never call this.
   */
  resolveCapability(
    capabilityKey: string,
    workspaceId: string,
  ): Promise<string | null>;
  runLlmStep(
    step: PlayLlmStep,
    inputs: Record<string, unknown>,
    context: { workspaceId: string; actorUserId: string | null },
  ): Promise<string>;
  journalSteps(
    runId: string,
    workspaceId: string,
    steps: RunPlayStepJournalEntry[],
  ): Promise<void>;
  finalizeRun(
    runId: string,
    workspaceId: string,
    patch: Record<string, unknown>,
  ): Promise<PlayRunRow | null>;
  now(): string;
  /** Optional hook for playbook learning loop */
  onLearningSignal?(
    signal: {
      signalType: "failed" | "guard_skipped";
      delta: Record<string, unknown>;
    },
    context: { run: PlayRunRow; template: PlayTemplateRow | null },
  ): Promise<void>;
}

export type RunPlayFailureCode =
  | "CLAIM_FAILED"
  | "NO_DEFINITION"
  | "TEMPLATE_INACTIVE"
  | "TRUST_READ_ONLY"
  | "CONSENT_MISSING"
  | "AUDIT_WRITE_FAILED"
  | "EXECUTION_FAILED";

export type RunPlayResult =
  | { ok: true; outcome: "ran" | "skipped"; run: PlayRunRow }
  | { ok: false; code: RunPlayFailureCode; message: string };

function extractExternalId(result: unknown): string | undefined {
  if (result === null || typeof result !== "object") return undefined;
  const record = result as Record<string, unknown>;
  const candidate = record.id ?? record.messageId ?? record.message_id;
  return typeof candidate === "string" ? candidate : undefined;
}

function resolveValuePatch(
  definition: PlayDefinition,
  gap: OpportunityGapRow | null,
  now: string,
): Record<string, unknown> {
  const value = definition.value;
  if (!value) return {};

  // Conservative by design: prefer the gap's minimum, never invent a number.
  const amount = value.fromGap
    ? gap?.amount_min ?? gap?.amount_max ?? null
    : value.amount ?? null;
  if (amount === null) return {};

  const patch: {
    value_kind: PlayValueKind;
    value_amount: number;
    value_currency: string;
    value_basis: PlayValueBasis;
    value_attributed_at: string;
  } = {
    value_kind: value.kind,
    value_amount: amount,
    value_currency: value.fromGap ? gap?.currency ?? value.currency : value.currency,
    value_basis: "estimated",
    value_attributed_at: now,
  };
  return patch;
}

export async function executePlayRun(
  runId: string,
  workspaceId: string,
  deps: RunPlayDeps,
): Promise<RunPlayResult> {
  const run = await deps.claimRun(runId, workspaceId);
  if (!run) {
    return {
      ok: false,
      code: "CLAIM_FAILED",
      message: "Play run could not be claimed — already executing, finished, or not found",
    };
  }

  const fail = async (
    code: RunPlayFailureCode,
    message: string,
    journal?: RunPlayStepJournalEntry[],
  ): Promise<RunPlayResult> => {
    await deps.finalizeRun(runId, workspaceId, {
      state: "failed",
      last_error: message,
      updated_at: deps.now(),
      ...(journal ? { metadata: { ...(run.metadata ?? {}), steps: journal } } : {}),
    });
    await deps.recordActivity(runId, workspaceId, {
      action: "logged",
      title: run.title,
      detail: `Play failed: ${message}`,
    });
    if (deps.onLearningSignal) {
      const template = run.template_id
        ? await deps.loadTemplate(run.template_id, workspaceId)
        : null;
      await deps.onLearningSignal(
        { signalType: "failed", delta: { code, message } },
        { run, template },
      );
    }
    return { ok: false, code, message };
  };

  try {
    if (!run.template_id) {
      return await fail("NO_DEFINITION", "Play run has no template to execute");
    }

    const template = await deps.loadTemplate(run.template_id, workspaceId);
    if (!template?.definition) {
      return await fail("NO_DEFINITION", "Play template has no compiled definition");
    }

    // Kill switch — checked after claiming, straight from the DB.
    if (!template.is_active) {
      return await fail("TEMPLATE_INACTIVE", "Play is paused — acting steps stopped");
    }

    const validation = validatePlayDefinition(template.definition);
    if (!validation.ok) {
      return await fail(
        "NO_DEFINITION",
        `Play definition invalid: ${validation.errors.join("; ")}`,
      );
    }
    const definition = validation.definition;

    const trust = await deps.getWorkspaceTrustLevel(workspaceId);
    const hasActing = validation.requiredActions.length > 0;
    if (hasActing && trust !== "act_with_approval") {
      return await fail(
        "TRUST_READ_ONLY",
        "Workspace trust is read-only — Salt cannot take actions",
      );
    }

    // Consent: every mutating slug must be in the recorded approved set, and
    // consent must name an approver (provenance for the audit log).
    const approvedActions = template.approved_actions ?? [];
    const unapproved = validation.requiredActions.filter(
      (slug) => !approvedActions.includes(slug),
    );
    if (hasActing && (unapproved.length > 0 || !template.actions_approved_by)) {
      return await fail(
        "CONSENT_MISSING",
        unapproved.length > 0
          ? `Play actions not approved: ${unapproved.join(", ")}`
          : "Play has no recorded consent approver",
      );
    }
    const actorUserId = template.actions_approved_by ?? "";

    const gap = run.opportunity_gap_id
      ? await deps.loadGap(run.opportunity_gap_id, workspaceId)
      : null;

    const context: StepContext = {
      run: {
        title: run.title,
        recipient_label: run.recipient_label,
        draft_body: run.draft_body,
        preview: run.preview,
        channel: run.channel,
        confidence: run.confidence,
      },
      gap: gap
        ? {
            claim: gap.claim,
            amount_min: gap.amount_min,
            amount_max: gap.amount_max,
            currency: gap.currency,
          }
        : null,
    };

    const priorJournal = Array.isArray(
      (run.metadata as { steps?: unknown } | null)?.steps,
    )
      ? ((run.metadata as { steps: RunPlayStepJournalEntry[] }).steps ?? [])
      : [];
    const journal: RunPlayStepJournalEntry[] = [];
    let actCount = 0;

    for (let index = 0; index < definition.steps.length; index += 1) {
      const step = definition.steps[index];
      const prior = priorJournal.find(
        (entry) => entry.index === index && entry.status === "completed",
      );

      // Resumed run: rebind prior results, never re-execute (idempotency).
      if (prior) {
        journal.push(prior);
        if ("bind" in step && prior.boundValue !== undefined) {
          context[step.bind] = prior.boundValue;
        }
        if (step.kind === "act") actCount += 1;
        continue;
      }

      if (step.kind === "guard") {
        if (!evaluateGuard(step, context)) {
          const skipped = await deps.finalizeRun(runId, workspaceId, {
            state: "dismissed",
            dismissed_at: deps.now(),
            updated_at: deps.now(),
            metadata: {
              ...(run.metadata ?? {}),
              steps: journal,
              skip_reason: `Guard not met: ${step.path} ${step.op}${step.value !== undefined ? ` ${String(step.value)}` : ""}`,
            },
          });
          await deps.recordActivity(runId, workspaceId, {
            action: "dismissed",
            title: run.title,
            detail: "Conditions no longer hold — play skipped without acting",
          });
          if (deps.onLearningSignal) {
            await deps.onLearningSignal(
              {
                signalType: "guard_skipped",
                delta: {
                  step_index: index,
                  path: step.path,
                  op: step.op,
                  value: step.value,
                },
              },
              { run, template: template ?? null },
            );
          }
          return { ok: true, outcome: "skipped", run: skipped ?? run };
        }
        journal.push({ index, kind: step.kind, status: "completed", completedAt: deps.now() });
        continue;
      }

      if (step.kind === "fetch") {
        const toolSlug = step.tool
          ? step.tool
          : await deps.resolveCapability(step.capability ?? "", workspaceId);
        if (!toolSlug) {
          // No connected tool for this capability — skip, don't fail.
          await deps.recordActivity(runId, workspaceId, {
            action: "logged",
            title: run.title,
            detail: `Skipped: no connected tool for ${step.capability}`,
            metadata: { capability: step.capability, step_index: index },
          });
          context[step.bind] = null;
          journal.push({
            index,
            kind: step.kind,
            status: "skipped",
            completedAt: deps.now(),
          });
          continue;
        }
        const params = interpolateParams(step.params, context);
        const result = await deps.executeTool(toolSlug, params, {
          workspaceId,
          actorUserId,
          approvedActions,
        });
        context[step.bind] = result;
        journal.push({
          index,
          kind: step.kind,
          status: "completed",
          boundValue: result,
          completedAt: deps.now(),
        });
      } else if (step.kind === "render") {
        const rendered = renderTemplate(step.template, context);
        context[step.bind] = rendered;
        journal.push({
          index,
          kind: step.kind,
          status: "completed",
          boundValue: rendered,
          completedAt: deps.now(),
        });
      } else if (step.kind === "llm") {
        const inputs = Object.fromEntries(
          step.inputs.map((path) => [path, resolvePath(context, path)]),
        );
        const text = await deps.runLlmStep(step, inputs, {
          workspaceId,
          actorUserId: actorUserId || null,
        });
        context[step.bind] = text;
        journal.push({
          index,
          kind: step.kind,
          status: "completed",
          boundValue: text,
          completedAt: deps.now(),
        });
      } else {
        // act — resolve capability → concrete tool first; skip (don't fail)
        // when nothing connected satisfies it.
        const toolSlug = step.tool
          ? step.tool
          : await deps.resolveCapability(step.capability ?? "", workspaceId);
        if (!toolSlug) {
          await deps.recordActivity(runId, workspaceId, {
            action: "logged",
            title: run.title,
            detail: `Skipped: no connected tool for ${step.capability}`,
            metadata: { capability: step.capability, step_index: index },
          });
          journal.push({
            index,
            kind: step.kind,
            status: "skipped",
            completedAt: deps.now(),
          });
          continue;
        }

        // Audit intent BEFORE the external call; abort if it can't land.
        const auditOk = await deps.recordActivity(runId, workspaceId, {
          action: "logged",
          title: run.title,
          detail: `Executing ${toolSlug}`,
          metadata: { tool: toolSlug, step_index: index },
        });
        if (!auditOk) {
          return await fail(
            "AUDIT_WRITE_FAILED",
            "Audit write failed before acting — aborting without executing",
            journal,
          );
        }

        // A capability act step passed the play's consent gate under its
        // "capability:<key>" approval unit (see validatePlayDefinition); the
        // concrete slug it resolves to is therefore approved-by-transitivity.
        // Pass it through so the execution gate sees an approved action —
        // only when the capability was genuinely approved (defense in depth).
        const stepApproved =
          step.capability &&
          approvedActions.includes(capabilityAction(step.capability))
            ? [...approvedActions, toolSlug]
            : approvedActions;

        const params = interpolateParams(step.params, context);
        const result = await deps.executeTool(toolSlug, params, {
          workspaceId,
          actorUserId,
          approvedActions: stepApproved,
        });
        actCount += 1;
        journal.push({
          index,
          kind: step.kind,
          status: "completed",
          externalId: extractExternalId(result),
          completedAt: deps.now(),
        });
      }

      // Persist progress after every step so a crash resumes, not re-sends.
      await deps.journalSteps(runId, workspaceId, journal);
    }

    const now = deps.now();
    const finalized = await deps.finalizeRun(runId, workspaceId, {
      state: "ran",
      ran_at: now,
      updated_at: now,
      metadata: { ...(run.metadata ?? {}), steps: journal },
      ...resolveValuePatch(definition, gap, now),
    });
    await deps.recordActivity(runId, workspaceId, {
      action: "ran",
      title: run.title,
      detail:
        actCount > 0
          ? `Play ran — ${actCount} action${actCount === 1 ? "" : "s"} executed`
          : "Play ran — no external actions required",
    });

    return { ok: true, outcome: "ran", run: finalized ?? run };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Play execution failed";
    return await fail("EXECUTION_FAILED", message);
  }
}
