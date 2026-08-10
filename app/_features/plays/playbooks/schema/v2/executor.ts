import "server-only";

/**
 * Playbook v2 Executor
 *
 * Unified executor for both learn and act layer playbooks:
 * - Learn layer: Memory updates through confidence-gated execution
 * - Act layer: Content drafts through voice-aware generation
 *
 * Simplified step types:
 * - fetch: Retrieve data from connected categories
 * - classify: Apply rules to categorize entities
 * - draft: Generate content using LLM with voice profile
 */

import type {
  PlaybookDefinitionV2,
  PlaybookStep,
  PlaybookFetchStep,
  PlaybookClassifyStep,
  PlaybookDraftStep,
  PlaybookActionStep,
  PlaybookBranchStep,
  VoiceProfile,
} from "./types";
import {
  checkCategoryRequirements,
  fetchMultipleByCategory,
  getConnectedCategories,
  getCategoryCapabilities,
} from "@/app/_lib/composio/category-fetcher";
import { fetchCaptureSource, isCaptureFetchCategory } from "./capture-fetch";
import { fetchMemorySource, isMemoryFetchCategory } from "./memory-fetch";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { buildPlaybookSourceContext } from "@/app/_features/plays/lib/play-record";

function getStepId(step: PlaybookStep, fallback: string): string {
  return "id" in step && typeof step.id === "string" ? step.id : fallback;
}

export type WorkspaceTrustLevel = "read_only" | "act_with_approval" | "trust";

/**
 * Capture-scoped execution context for playbooks triggered by a capture
 * (e.g. email-triage). Fields are exposed to definitions as `$capture.<key>`
 * — e.g. `$capture.id`, `$capture.gmail_message_id`.
 */
export interface CaptureExecutionContext {
  /** capture_events.id */
  id: string;
  source_type: string;
  /** Provider message id (Gmail message id for gmail captures). */
  gmail_message_id: string | null;
  thread_id: string | null;
  sender_email: string | null;
  subject: string | null;
}

export interface ExecutionContextV2 {
  workspaceId: string;
  userId: string;
  triggeredBy: {
    type: "signal" | "schedule" | "manual";
    signalKey?: string;
    entityId?: string;
    entitySurface?: string;
    entityLabel?: string;
  };
  connectedCategories: Set<string>;
  connectedCapabilities: Set<string>;
  voice?: VoiceProfile;
  trustLevel?: WorkspaceTrustLevel;
  toolApprovalOverrides?: Map<string, boolean>;
  /** Present when the playbook was triggered by a specific capture event. */
  captureContext?: CaptureExecutionContext;
}

export interface StepResult {
  stepId: string;
  status: "success" | "skipped" | "error" | "paused";
  data?: unknown;
  error?: string;
  pausedForApproval?: {
    toolSlug: string;
    args: Record<string, unknown>;
    stepIndex: number;
    /**
     * Set when the pause is a park, not a gate: the connector is unavailable
     * (disconnected / expired grant). The run is stored as state "blocked"
     * and approving it after a reconnect resumes the exact pending call.
     */
    blocked?: { reason: string; provider?: string };
  };
}

export interface ExecutionResultV2 {
  status: "success" | "skipped" | "error" | "paused";
  playbookSlug: string;
  layer: "learn" | "act";
  reason?: string;
  stepResults: StepResult[];
  outputCount?: number;
  playRunIds?: string[];
  durationMs: number;
  pausedAt?: {
    stepIndex: number;
    toolSlug: string;
    args: Record<string, unknown>;
    playRunId?: string;
    /** Present when the pause is a connector park, not an approval gate. */
    blocked?: { reason: string; provider?: string };
  };
}

export async function buildExecutionContextV2(
  workspaceId: string,
  userId: string,
  triggeredBy: ExecutionContextV2["triggeredBy"],
  voiceSlug?: string,
  captureContext?: CaptureExecutionContext
): Promise<ExecutionContextV2> {
  const connected = await getConnectedCategories(workspaceId);
  const connectedCategories = new Set(connected.map((c) => c.category));

  const capabilities = new Set<string>();
  for (const category of connectedCategories) {
    const catCapabilities = await getCategoryCapabilities(workspaceId, category);
    catCapabilities.forEach((cap) => capabilities.add(cap));
  }

  let voice: VoiceProfile | undefined;
  if (voiceSlug) {
    voice = await resolveVoice(workspaceId, voiceSlug);
  }

  return {
    workspaceId,
    userId,
    triggeredBy,
    connectedCategories,
    connectedCapabilities: capabilities,
    voice,
    trustLevel: await loadWorkspaceTrustLevel(workspaceId),
    captureContext,
  };
}

/**
 * The workspace trust dial (Settings → Plays) is the ceiling for step gates:
 * in read_only / act_with_approval every action step pauses for approval;
 * only trust mode lets declared-auto steps run. Unset or unreadable rows
 * resolve to the safe default (read_only).
 */
async function loadWorkspaceTrustLevel(
  workspaceId: string
): Promise<WorkspaceTrustLevel> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("workspaces")
      .select("trust_level")
      .eq("id", workspaceId)
      .maybeSingle();

    return data?.trust_level === "act_with_approval" ||
      data?.trust_level === "trust"
      ? data.trust_level
      : "read_only";
  } catch (error) {
    console.error("[executor] failed to load workspace trust level", error);
    return "read_only";
  }
}

async function resolveVoice(
  workspaceId: string,
  voiceSlug: string
): Promise<VoiceProfile | undefined> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("user_voices")
    .select("*")
    .or(`type.eq.salt,workspace_id.eq.${workspaceId}`)
    .eq("slug", voiceSlug)
    .single();

  if (data) {
    return {
      name: data.name,
      slug: data.slug,
      type: data.type as "salt" | "custom",
      tone: data.tone,
      instructions: data.instructions,
      sign_off: data.sign_off ?? undefined,
      workspace_id: data.workspace_id,
    };
  }

  const { SALT_PROVIDED_VOICES } = await import("./types");
  const saltVoice = SALT_PROVIDED_VOICES.find((v) => v.slug === voiceSlug);
  return saltVoice;
}

export async function executePlaybookV2(
  playbook: PlaybookDefinitionV2,
  context: ExecutionContextV2
): Promise<ExecutionResultV2> {
  const startTime = Date.now();
  const stepResults: StepResult[] = [];

  if (playbook.requirements?.categories?.required) {
    const required = playbook.requirements.categories.required;
    const optional = playbook.requirements.categories.optional ?? [];

    const check = await checkCategoryRequirements(
      context.workspaceId,
      required,
      optional
    );

    if (!check.satisfied) {
      return {
        status: "skipped",
        playbookSlug: playbook.slug,
        layer: playbook.layer,
        reason: `Missing required categories: ${check.missing.join(", ")}`,
        stepResults: [],
        durationMs: Date.now() - startTime,
      };
    }
  }

  const stepData = new Map<string, unknown>();

  if (playbook.steps) {
    for (const [index, step] of playbook.steps.entries()) {
      const stepId = getStepId(step, `${playbook.slug}-step-${index}`);
      const result = await executeStep(step, context, stepData, index, playbook.slug);
      stepResults.push(result);

      if (result.status === "paused" && result.pausedForApproval) {
        const stepHistory = playbook.steps
          .slice(0, index + 1)
          .map((s, i) => ({
            id: getStepId(s, `${playbook.slug}-step-${i}`),
            kind: s.step,
            status: stepResults[i]?.status ?? "success",
          }));
        const playRunId = await createPausedPlayRun(
          playbook,
          context,
          index,
          result.pausedForApproval,
          stepData,
          stepHistory
        );
        const blocked = result.pausedForApproval.blocked;
        return {
          status: "paused",
          playbookSlug: playbook.slug,
          layer: playbook.layer,
          reason: blocked
            ? `Parked at step "${stepId}": ${blocked.reason}`
            : `Paused at step "${stepId}" for approval`,
          stepResults,
          durationMs: Date.now() - startTime,
          pausedAt: {
            stepIndex: index,
            toolSlug: result.pausedForApproval.toolSlug,
            args: result.pausedForApproval.args,
            playRunId,
            blocked,
          },
        };
      }

      if (result.status === "error") {
        return {
          status: "error",
          playbookSlug: playbook.slug,
          layer: playbook.layer,
          reason: `Step "${stepId}" failed: ${result.error}`,
          stepResults,
          durationMs: Date.now() - startTime,
        };
      }

      if (result.data !== undefined) {
        stepData.set(stepId, result.data);
      }
    }
  }

  const outputResult = await generateOutputV2(
    playbook,
    context,
    stepData
  );

  return {
    status: "success",
    playbookSlug: playbook.slug,
    layer: playbook.layer,
    stepResults,
    outputCount: outputResult.count,
    playRunIds: outputResult.playRunIds,
    durationMs: Date.now() - startTime,
  };
}

async function executeStep(
  step: PlaybookStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  stepIndex: number,
  playbookSlug: string
): Promise<StepResult> {
  switch (step.step) {
    case "fetch":
      return executeFetchStep(step, context, stepData);
    case "classify":
      return executeClassifyStep(step, stepData);
    case "draft":
      return executeDraftStep(step, context, stepData);
    case "action":
      return executeActionStep(step, context, stepData, stepIndex, playbookSlug);
    case "branch":
      return executeBranchStep(step, context, stepData, stepIndex, playbookSlug);
    default:
      return {
        stepId: getStepId(step, "unknown"),
        status: "error",
        error: `Unknown step type`,
      };
  }
}

async function executeFetchStep(
  step: PlaybookFetchStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>
): Promise<StepResult> {
  try {
    const [category, capability] = step.from.split(".");
    const where = step.where
      ? interpolateArgs(step.where, stepData, context)
      : undefined;

    // "capture" reads Salt's own capture_events table, not a connector —
    // no connected-category requirement.
    if (isCaptureFetchCategory(category)) {
      const data = await fetchCaptureSource(
        context.workspaceId,
        capability,
        where
      );
      return { stepId: step.id, status: "success", data };
    }

    // "memory" reads Salt's own Memory tables (people, work) — likewise not a
    // connector category. Entity-scoped capabilities resolve from the trigger.
    if (isMemoryFetchCategory(category)) {
      const data = await fetchMemorySource(
        context.workspaceId,
        capability,
        where,
        {
          entityId: context.triggeredBy.entityId,
          entitySurface: context.triggeredBy.entitySurface,
        }
      );
      return { stepId: step.id, status: "success", data };
    }

    if (!context.connectedCategories.has(category)) {
      if (step.optional) {
        return { stepId: step.id, status: "skipped", data: [] };
      }
      return {
        stepId: step.id,
        status: "error",
        error: `Category "${category}" not connected`,
      };
    }

    const result = await fetchMultipleByCategory(context.workspaceId, [
      {
        id: step.id,
        category: category as Parameters<typeof fetchMultipleByCategory>[1][0]["category"],
        capability,
        filter: where,
        optional: step.optional,
      },
    ]);

    if (!result.success) {
      if (step.optional) {
        return { stepId: step.id, status: "skipped", data: [] };
      }
      return {
        stepId: step.id,
        status: "error",
        error: result.errors.join("; "),
      };
    }

    return {
      stepId: step.id,
      status: "success",
      data: result.results[step.id]?.data ?? [],
    };
  } catch (error) {
    if (step.optional) {
      return { stepId: step.id, status: "skipped", data: [] };
    }
    return {
      stepId: step.id,
      status: "error",
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

function executeClassifyStep(
  step: PlaybookClassifyStep,
  stepData: Map<string, unknown>
): StepResult {
  const sourceKey = step.forEach ?? step.input;
  if (!sourceKey) {
    return {
      stepId: step.id,
      status: "error",
      error: "Classify step missing forEach or input",
    };
  }

  const sourceData = stepData.get(sourceKey);

  // A single-object source (e.g. memory.person_context for one signaled
  // entity) classifies as a one-item list.
  const sourceList = Array.isArray(sourceData)
    ? sourceData
    : sourceData !== null && typeof sourceData === "object"
      ? [sourceData]
      : null;

  if (!sourceList) {
    return {
      stepId: step.id,
      status: "error",
      error: `Source "${sourceKey}" is not an array or object`,
    };
  }

  const classified = sourceList.map((entity) => {
    for (const rule of step.rules) {
      if (evaluateCondition(rule.if, entity)) {
        return { entity, tag: rule.then };
      }
    }
    return { entity, tag: step.else ?? "unclassified" };
  });

  return {
    stepId: step.id,
    status: "success",
    data: classified,
  };
}

function evaluateCondition(condition: string, entity: unknown): boolean {
  if (condition === "true") return true;
  if (condition === "false") return false;

  const record = entity as Record<string, unknown>;

  const comparisonMatch = condition.match(
    /^([a-zA-Z0-9_.]+)\s*(>=|<=|>|<|==|!=)\s*(.+)$/
  );

  if (comparisonMatch) {
    const [, path, operator, valueStr] = comparisonMatch;
    const actualValue = getNestedValue(record, path);
    const expectedValue = parseValue(valueStr.trim());

    switch (operator) {
      case ">=":
        return Number(actualValue) >= Number(expectedValue);
      case "<=":
        return Number(actualValue) <= Number(expectedValue);
      case ">":
        return Number(actualValue) > Number(expectedValue);
      case "<":
        return Number(actualValue) < Number(expectedValue);
      case "==":
        return actualValue === expectedValue;
      case "!=":
        return actualValue !== expectedValue;
    }
  }

  return false;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function parseValue(str: string): unknown {
  if (str === "true") return true;
  if (str === "false") return false;
  if (str === "null") return null;
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1);
  }
  if (str.startsWith("'") && str.endsWith("'")) {
    return str.slice(1, -1);
  }
  return str;
}

async function executeDraftStep(
  step: PlaybookDraftStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>
): Promise<StepResult> {
  // forEach drafts once per item of the named source list; {{item.*}} in the
  // prompt resolves to the current item. Result pairs each item with its draft.
  if (step.forEach) {
    const source = stepData.get(step.forEach);
    const sourceList = Array.isArray(source)
      ? source
      : source !== null && typeof source === "object"
        ? [source]
        : null;

    if (!sourceList) {
      return {
        stepId: step.id,
        status: "error",
        error: `forEach source "${step.forEach}" is not an array or object`,
      };
    }

    const drafts: Array<{ item: unknown; draft: string }> = [];
    for (const item of sourceList) {
      const scoped = new Map(stepData);
      scoped.set("item", item);
      const result = await runDraftPrompt(step, context, scoped);
      if (result.status === "error") return result;
      drafts.push({ item, draft: typeof result.data === "string" ? result.data : "" });
    }

    return { stepId: step.id, status: "success", data: drafts };
  }

  return runDraftPrompt(step, context, stepData);
}

async function runDraftPrompt(
  step: PlaybookDraftStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>
): Promise<StepResult> {
  const prompt = interpolatePrompt(step.prompt, stepData, context);
  const systemPrompt = buildSystemPrompt(context.voice);

  try {
    const { sendLlm, committedSpend } = await import("@/app/_lib/ai/gpt");

    const result = await sendLlm(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      // A playbook step runs inside an approved playbook. Same reasoning as
      // the compiled-play executor: degrade it, never abandon it.
      committedSpend(context.workspaceId, context.userId),
      {
        routingKey: "playDraft",
        maxTokens: step.max_tokens ?? 500,
        temperature: 0.7,
      }
    );

    return {
      stepId: step.id,
      status: "success",
      data: result ?? "",
    };
  } catch (error) {
    return {
      stepId: step.id,
      status: "error",
      error: error instanceof Error ? error.message : "Draft generation failed",
    };
  }
}

async function executeActionStep(
  step: PlaybookActionStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  stepIndex: number,
  playbookSlug: string
): Promise<StepResult> {
  const stepId = step.id ?? `action-${stepIndex}`;
  const args = step.args ?? {};
  const interpolatedArgs = interpolateArgs(args, stepData, context);

  // Memory monopoly, runtime layer: parse-time rejection in parser.ts is the
  // first guard; this catches definitions that bypass parsing (DB-stored
  // definitions, future authoring paths). Never pause for approval — the
  // answer is always no.
  const { isMemoryMutatingSlug } = await import("../../memory-monopoly");
  if (isMemoryMutatingSlug(step.tool)) {
    return {
      stepId,
      status: "error",
      error: `Memory-mutating tool "${step.tool}" is not allowed in playbooks — Memory Care owns Memory writes`,
    };
  }

  const needsApproval = await checkStepNeedsApproval(
    step,
    context,
    playbookSlug
  );

  if (needsApproval) {
    return {
      stepId,
      status: "paused",
      pausedForApproval: {
        toolSlug: step.tool,
        args: interpolatedArgs,
        stepIndex,
      },
    };
  }

  // Approval policy cleared this step (playbook declaration + trust level +
  // tool policy + earned autonomy), so execute the declared tool directly.
  // Consent scope is exactly the one tool the playbook step names.
  try {
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );
    const result = await executeConnectorTool(step.tool, interpolatedArgs, {
      workspaceId: context.workspaceId,
      actorUserId: context.userId,
      approvedActions: [step.tool],
    });

    return {
      stepId,
      status: "success",
      data: {
        tool: step.tool,
        args: interpolatedArgs,
        executed: true,
        result,
      },
    };
  } catch (error) {
    const { ConnectorUnavailableError } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );

    // Park-and-resume: the connector is the problem, the run is recoverable.
    // Surface as a blocked pause so the queue shows it immediately and the
    // approve path resumes the exact pending call after a reconnect.
    if (error instanceof ConnectorUnavailableError) {
      return {
        stepId,
        status: "paused",
        pausedForApproval: {
          toolSlug: step.tool,
          args: interpolatedArgs,
          stepIndex,
          blocked: { reason: error.message, provider: error.provider },
        },
      };
    }

    return {
      stepId,
      status: "error",
      error: error instanceof Error ? error.message : `Tool ${step.tool} failed`,
    };
  }
}

/**
 * Branch step: run nested steps only when `if` holds against prior step data.
 * Supports the `if` + `steps` form (what email-triage uses); `switch`/`goto`
 * parse but are not yet executable.
 */
async function executeBranchStep(
  step: PlaybookBranchStep,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>,
  stepIndex: number,
  playbookSlug: string
): Promise<StepResult> {
  const stepId = step.id ?? `branch-${stepIndex}`;

  if (!step.if || !step.steps || step.steps.length === 0) {
    return {
      stepId,
      status: "skipped",
      data: { executed: false, reason: "Branch has no if/steps clause" },
    };
  }

  // Conditions reference prior step ids as paths, e.g.
  // "classification.triage_action == 'silent_archive'".
  const dataView = Object.fromEntries(stepData) as Record<string, unknown>;
  if (!evaluateCondition(step.if, dataView)) {
    return { stepId, status: "success", data: { executed: false } };
  }

  const nestedResults: StepResult[] = [];
  for (const [nestedIndex, nested] of step.steps.entries()) {
    const nestedId = getStepId(nested, `${stepId}-step-${nestedIndex}`);
    const result = await executeStep(
      nested,
      context,
      stepData,
      stepIndex,
      playbookSlug
    );
    nestedResults.push(result);

    // Pause and error propagate to the playbook loop unchanged so approval
    // runs are created exactly as for top-level steps.
    if (result.status === "paused" || result.status === "error") {
      return result;
    }

    if (result.data !== undefined) {
      stepData.set(nestedId, result.data);
    }
  }

  return {
    stepId,
    status: "success",
    data: { executed: true, steps: nestedResults.map((r) => r.stepId) },
  };
}

async function checkStepNeedsApproval(
  step: PlaybookActionStep,
  context: ExecutionContextV2,
  playbookSlug: string
): Promise<boolean> {
  // Hard gate — never earned away (money sends, destructive actions).
  if (step.approval === "required") {
    return true;
  }

  // Soft gate (GROW): pause for approval until the workspace has approved
  // this playbook+tool combination enough times, then act silently.
  // `needsApproval` is the pre-2026-08 spelling of `approval: "ask"`.
  if (step.approval === "ask" || step.needsApproval) {
    const { hasEarnedAutonomy } = await import(
      "@/app/_features/plays/services/earned-autonomy"
    );
    const earned = await hasEarnedAutonomy(
      context.workspaceId,
      playbookSlug,
      step.tool
    );
    if (!earned) {
      return true;
    }
  }

  // The workspace dial is the ceiling: outside trust mode every action asks.
  if (
    context.trustLevel === "act_with_approval" ||
    context.trustLevel === "read_only"
  ) {
    return true;
  }

  if (context.trustLevel === "trust") {
    if (context.toolApprovalOverrides?.get(step.tool) === true) {
      return true;
    }

    const { getComposioToolPolicy } = await import("@/app/_lib/composio/tool-policy");
    const policy = getComposioToolPolicy(step.tool);
    if (policy?.requiresHumanConfirmation) {
      return true;
    }
  }

  return false;
}

function interpolateArgs(
  args: Record<string, unknown>,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): Record<string, unknown> {
  return interpolateValue(args, stepData, context) as Record<string, unknown>;
}

/** Recursively interpolate template strings inside nested args/where values. */
function interpolateValue(
  value: unknown,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): unknown {
  if (typeof value === "string") {
    return interpolatePrompt(value, stepData, context);
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateValue(item, stepData, context));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = interpolateValue(entry, stepData, context);
    }
    return result;
  }
  return value;
}

/**
 * Entity target for signal-triggered runs — stamps play_runs.target_* so the
 * queue card and dispatch dedup can key on the entity that fired the signal.
 */
function signalTriggerTarget(context: ExecutionContextV2): {
  target_type?: string;
  target_id?: string;
  target_label?: string;
} {
  const t = context.triggeredBy;
  if (t.type !== "signal" || !t.entityId || !t.entitySurface) return {};
  return {
    target_type: t.entitySurface,
    target_id: t.entityId,
    target_label: t.entityLabel ?? t.entityId,
  };
}

async function createPausedPlayRun(
  playbook: PlaybookDefinitionV2,
  context: ExecutionContextV2,
  stepIndex: number,
  pauseInfo: {
    toolSlug: string;
    args: Record<string, unknown>;
    blocked?: { reason: string; provider?: string };
  },
  stepData: Map<string, unknown>,
  stepHistory?: Array<{ id: string; kind: string; status: string }>
): Promise<string | undefined> {
  const admin = createAdminClient();
  const blocked = pauseInfo.blocked;

  // Step results are arbitrary fetched/drafted payloads; the boundary cast
  // lets them into the context_inputs Json column.
  const stepDataObj: Record<string, Json> = {};
  for (const [k, v] of stepData) {
    stepDataObj[k] = v as Json;
  }

  const { data: run, error } = await admin
    .from("play_runs")
    .insert({
      workspace_id: context.workspaceId,
      state: blocked ? "blocked" : "queued",
      title: blocked
        ? `${playbook.name} — ${blocked.provider ?? "connector"} needs attention`
        : `${playbook.name} — Approval Required`,
      preview: blocked
        ? `Parked: ${blocked.reason}. Reconnect, then approve to resume.`
        : `Waiting for approval to execute ${pauseInfo.toolSlug}`,
      last_error: blocked?.reason ?? null,
      trigger_source: context.triggeredBy.type,
      ...signalTriggerTarget(context),
      source_context: buildPlaybookSourceContext({
        playbookSlug: playbook.slug,
        triggerSignal: context.triggeredBy.signalKey,
      }),
      trigger_evidence: {
        signal_key: context.triggeredBy.signalKey,
        triggered_by: context.triggeredBy,
        voice: context.voice?.slug,
        ...(blocked ? { blocked: blocked as unknown as Json } : {}),
      },
      context_inputs: stepDataObj,
      // Compact trace of what ran before the pause so the queue card can
      // show the chain (steps auto-ran → pending action).
      ...(stepHistory && stepHistory.length > 0
        ? { metadata: { step_history: stepHistory as unknown as Json } }
        : {}),
      paused_at_step: stepIndex,
      paused_for_approval: true,
      approval_context: {
        tool_slug: pauseInfo.toolSlug,
        args: pauseInfo.args as Json,
        step_index: stepIndex,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create paused play run:", error);
    return undefined;
  }

  // Immediate notification for parked runs: the queue is Salt's notification
  // surface, so the blocked card IS the alert — this activity entry is the
  // audit trail and the feed line for it.
  if (blocked && run) {
    try {
      await admin.from("activity_entries").insert({
        workspace_id: context.workspaceId,
        play_run_id: run.id as string,
        action: "parked",
        title: `${playbook.name} parked — connector needs attention`,
        detail: blocked.reason,
        metadata: {
          playbook_slug: playbook.slug,
          tool_slug: pauseInfo.toolSlug,
          provider: blocked.provider ?? null,
          step_index: stepIndex,
        },
      });
    } catch (activityError) {
      console.error(
        "[executor] failed to record parked notification:",
        activityError
      );
    }
  }

  return run?.id as string | undefined;
}

function stringifyTemplateValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    // Arrays/objects (e.g. a digest email list) render as JSON so the LLM
    // sees the data, not "[object Object]".
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isTemplateIdentifierChar(char: string): boolean {
  return /[a-zA-Z0-9_]/.test(char);
}

function resolveTemplateVarPath(
  varPath: string,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): unknown {
  if (varPath.startsWith("context.")) {
    return getNestedValue(context as unknown as Record<string, unknown>, varPath.slice(8));
  }

  if (varPath === "capture" || varPath.startsWith("capture.")) {
    return varPath === "capture"
      ? context.captureContext
      : getNestedValue(
          (context.captureContext ?? {}) as unknown as Record<string, unknown>,
          varPath.slice(8)
        );
  }

  const [stepId, ...rest] = varPath.split(".");
  const stepResult = stepData.get(stepId);
  if (rest.length > 0 && stepResult != null) {
    return getNestedValue(stepResult as Record<string, unknown>, rest.join("."));
  }
  return stepResult;
}

/** Avoid regex on playbook templates (CodeQL js/polynomial-redos). */
function replaceCapturePlaceholders(
  input: string,
  context: ExecutionContextV2
): string {
  const marker = "$capture.";
  let result = "";
  let cursor = 0;

  while (cursor < input.length) {
    const start = input.indexOf(marker, cursor);
    if (start === -1) {
      result += input.slice(cursor);
      break;
    }

    result += input.slice(cursor, start);
    let fieldEnd = start + marker.length;
    while (fieldEnd < input.length && isTemplateIdentifierChar(input[fieldEnd]!)) {
      fieldEnd += 1;
    }

    if (fieldEnd === start + marker.length) {
      result += input[start]!;
      cursor = start + 1;
      continue;
    }

    const field = input.slice(start + marker.length, fieldEnd);
    const capture = context.captureContext;
    if (!capture) {
      result += input.slice(start, fieldEnd);
    } else {
      const value = (capture as unknown as Record<string, unknown>)[field];
      result += stringifyTemplateValue(value);
    }
    cursor = fieldEnd;
  }

  return result;
}

/** Avoid regex on interpolated output (CodeQL js/polynomial-redos). */
function replaceDoubleBracePlaceholders(
  input: string,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): string {
  let result = "";
  let cursor = 0;

  while (cursor < input.length) {
    const open = input.indexOf("{{", cursor);
    if (open === -1) {
      result += input.slice(cursor);
      break;
    }

    result += input.slice(cursor, open);
    const close = input.indexOf("}}", open + 2);
    if (close === -1) {
      result += input.slice(open);
      break;
    }

    const varPath = input.slice(open + 2, close).trim();
    const value = resolveTemplateVarPath(varPath, stepData, context);
    result += stringifyTemplateValue(value);
    cursor = close + 2;
  }

  return result;
}

function interpolatePrompt(
  template: string,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): string {
  const withCapture = replaceCapturePlaceholders(template, context);
  return replaceDoubleBracePlaceholders(withCapture, stepData, context);
}

function buildSystemPrompt(voice?: VoiceProfile): string {
  const base = `You are Salt, an AI assistant for creative professionals and solo business owners.
You help with business communication, preparation, and follow-ups.`;

  if (!voice) {
    return base;
  }

  return `${base}

Voice Profile: ${voice.name}
Tone: ${voice.tone}

Instructions:
${voice.instructions}
${voice.sign_off ? `\nSign off with: "${voice.sign_off}"` : ""}`;
}

async function generateOutputV2(
  playbook: PlaybookDefinitionV2,
  context: ExecutionContextV2,
  stepData: Map<string, unknown>
): Promise<{ count: number; playRunIds: string[] }> {
  const admin = createAdminClient();
  const playRunIds: string[] = [];

  if (playbook.layer === "learn") {
    return { count: 0, playRunIds: [] };
  }

  const draftStepId = playbook.steps?.find((s) => s.step === "draft")?.id;
  const draftContent = draftStepId ? stepData.get(draftStepId) : null;

  const classifyStepId = playbook.steps?.find((s) => s.step === "classify")?.id;
  const classifiedData = classifyStepId ? stepData.get(classifyStepId) : null;

  if (playbook.output.type === "email_draft") {
    if (Array.isArray(classifiedData)) {
      for (const item of classifiedData) {
        const classified = item as { entity: unknown; tag: string };

        const { data: run, error } = await admin
          .from("play_runs")
          .insert({
            workspace_id: context.workspaceId,
            state: playbook.output.approval === "auto" ? "executing" : "queued",
            title: `${playbook.name} — ${classified.tag}`,
            preview: typeof draftContent === "string" ? draftContent.slice(0, 200) : playbook.description,
            trigger_source: context.triggeredBy.type,
            ...signalTriggerTarget(context),
            source_context: buildPlaybookSourceContext({
              playbookSlug: playbook.slug,
              triggerSignal: context.triggeredBy.signalKey,
            }),
            trigger_evidence: {
              signal_key: context.triggeredBy.signalKey,
              classification_tag: classified.tag,
              triggered_by: context.triggeredBy,
              voice: context.voice?.slug,
            },
            context_inputs: {
              entity: classified.entity as Json,
              tag: classified.tag,
              draft: draftContent as Json,
            },
          })
          .select("id")
          .single();

        if (!error && run) {
          playRunIds.push(run.id as string);
        }
      }
    } else if (draftContent) {
      const { data: run, error } = await admin
        .from("play_runs")
        .insert({
          workspace_id: context.workspaceId,
          state: playbook.output.approval === "auto" ? "executing" : "queued",
          title: playbook.name,
          preview: typeof draftContent === "string" ? draftContent.slice(0, 200) : playbook.description,
          trigger_source: context.triggeredBy.type,
          ...signalTriggerTarget(context),
          source_context: buildPlaybookSourceContext({
            playbookSlug: playbook.slug,
            triggerSignal: context.triggeredBy.signalKey,
          }),
          trigger_evidence: {
            signal_key: context.triggeredBy.signalKey,
            triggered_by: context.triggeredBy,
            voice: context.voice?.slug,
          },
          context_inputs: {
            draft: draftContent as Json,
          },
        })
        .select("id")
        .single();

      if (!error && run) {
        playRunIds.push(run.id as string);
      }
    }
  } else if (playbook.output.type === "briefing" && draftContent) {
    const { data: run, error } = await admin
      .from("play_runs")
      .insert({
        workspace_id: context.workspaceId,
        state: "auto_handled",
        title: playbook.name,
        preview: typeof draftContent === "string" ? draftContent.slice(0, 200) : playbook.description,
        trigger_source: context.triggeredBy.type,
        ...signalTriggerTarget(context),
        source_context: buildPlaybookSourceContext({
          playbookSlug: playbook.slug,
          triggerSignal: context.triggeredBy.signalKey,
        }),
        trigger_evidence: {
          signal_key: context.triggeredBy.signalKey,
          triggered_by: context.triggeredBy,
        },
        context_inputs: {
          briefing: draftContent as Json,
        },
      })
      .select("id")
      .single();

    if (!error && run) {
      playRunIds.push(run.id as string);
    }
  } else if (
    (playbook.output.type === "notification" ||
      playbook.output.type === "finding") &&
    draftContent
  ) {
    // Informational outputs surface in Activity: approval none → auto_handled;
    // per_entity/batch → queued so the user reviews before it's filed.
    const { data: run, error } = await admin
      .from("play_runs")
      .insert({
        workspace_id: context.workspaceId,
        state:
          !playbook.output.approval || playbook.output.approval === "auto"
            ? "auto_handled"
            : "queued",
        title: playbook.name,
        preview: typeof draftContent === "string" ? draftContent.slice(0, 200) : playbook.description,
        trigger_source: context.triggeredBy.type,
        ...signalTriggerTarget(context),
        source_context: buildPlaybookSourceContext({
          playbookSlug: playbook.slug,
          triggerSignal: context.triggeredBy.signalKey,
        }),
        trigger_evidence: {
          signal_key: context.triggeredBy.signalKey,
          output_type: playbook.output.type,
          triggered_by: context.triggeredBy,
          voice: context.voice?.slug,
        },
        context_inputs: {
          [playbook.output.type]: draftContent as Json,
        },
      })
      .select("id")
      .single();

    if (!error && run) {
      playRunIds.push(run.id as string);
    }
  }

  return { count: playRunIds.length, playRunIds };
}

export async function canPlaybookRunV2(
  playbook: PlaybookDefinitionV2,
  workspaceId: string
): Promise<{ canRun: boolean; reason?: string }> {
  if (!playbook.requirements?.categories?.required) {
    return { canRun: true };
  }

  const check = await checkCategoryRequirements(
    workspaceId,
    playbook.requirements.categories.required,
    playbook.requirements.categories.optional ?? []
  );

  if (!check.satisfied) {
    return {
      canRun: false,
      reason: `Missing required categories: ${check.missing.join(", ")}`,
    };
  }

  return { canRun: true };
}
