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
import { createAdminClient } from "@/app/_lib/supabase/admin";

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
    captureContext,
  };
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
      sign_off: data.sign_off,
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
        const playRunId = await createPausedPlayRun(
          playbook,
          context,
          index,
          result.pausedForApproval,
          stepData
        );
        return {
          status: "paused",
          playbookSlug: playbook.slug,
          layer: playbook.layer,
          reason: `Paused at step "${stepId}" for approval`,
          stepResults,
          durationMs: Date.now() - startTime,
          pausedAt: {
            stepIndex: index,
            toolSlug: result.pausedForApproval.toolSlug,
            args: result.pausedForApproval.args,
            playRunId,
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

  if (!Array.isArray(sourceData)) {
    return {
      stepId: step.id,
      status: "error",
      error: `Source "${step.forEach}" is not an array`,
    };
  }

  const classified = sourceData.map((entity) => {
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
  if (step.needsApproval) {
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

  if (context.trustLevel === "act_with_approval") {
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

async function createPausedPlayRun(
  playbook: PlaybookDefinitionV2,
  context: ExecutionContextV2,
  stepIndex: number,
  pauseInfo: {
    toolSlug: string;
    args: Record<string, unknown>;
  },
  stepData: Map<string, unknown>
): Promise<string | undefined> {
  const admin = createAdminClient();

  const stepDataObj: Record<string, unknown> = {};
  for (const [k, v] of stepData) {
    stepDataObj[k] = v;
  }

  const { data: run, error } = await admin
    .from("play_runs")
    .insert({
      workspace_id: context.workspaceId,
      state: "queued",
      title: `${playbook.name} — Approval Required`,
      preview: `Waiting for approval to execute ${pauseInfo.toolSlug}`,
      trigger_source: context.triggeredBy.type,
      trigger_evidence: {
        playbook_slug: playbook.slug,
        triggered_by: context.triggeredBy,
        voice: context.voice?.slug,
      },
      context_inputs: stepDataObj,
      paused_at_step: stepIndex,
      paused_for_approval: true,
      approval_context: {
        tool_slug: pauseInfo.toolSlug,
        args: pauseInfo.args,
        step_index: stepIndex,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create paused play run:", error);
    return undefined;
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

function interpolatePrompt(
  template: string,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): string {
  let result = template;

  // $capture.<field> — capture-scoped context (email-triage style definitions).
  const capturePattern = /\$capture\.([a-zA-Z0-9_]+)/g;
  result = result.replace(capturePattern, (token, field: string) => {
    const capture = context.captureContext;
    if (!capture) return token;
    const value = (capture as unknown as Record<string, unknown>)[field];
    return stringifyTemplateValue(value);
  });

  const varPattern = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = varPattern.exec(result)) !== null) {
    const varPath = match[1].trim();
    let value: unknown;

    if (varPath.startsWith("context.")) {
      value = getNestedValue(context as unknown as Record<string, unknown>, varPath.slice(8));
    } else if (varPath === "capture" || varPath.startsWith("capture.")) {
      value = varPath === "capture"
        ? context.captureContext
        : getNestedValue(
            (context.captureContext ?? {}) as unknown as Record<string, unknown>,
            varPath.slice(8)
          );
    } else {
      const [stepId, ...rest] = varPath.split(".");
      const stepResult = stepData.get(stepId);
      if (rest.length > 0 && stepResult != null) {
        value = getNestedValue(stepResult as Record<string, unknown>, rest.join("."));
      } else {
        value = stepResult;
      }
    }

    const replacement = stringifyTemplateValue(value);
    result =
      result.slice(0, match.index) +
      replacement +
      result.slice(match.index + match[0].length);
    // Resume matching after the replacement to keep indices consistent.
    varPattern.lastIndex = match.index + replacement.length;
  }

  return result;
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
            state: playbook.output.approval === "none" ? "executing" : "queued",
            title: `${playbook.name} — ${classified.tag}`,
            preview: typeof draftContent === "string" ? draftContent.slice(0, 200) : playbook.description,
            trigger_source: context.triggeredBy.type,
            trigger_evidence: {
              playbook_slug: playbook.slug,
              classification_tag: classified.tag,
              triggered_by: context.triggeredBy,
              voice: context.voice?.slug,
            },
            context_inputs: {
              entity: classified.entity,
              tag: classified.tag,
              draft: draftContent,
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
          state: playbook.output.approval === "none" ? "executing" : "queued",
          title: playbook.name,
          preview: typeof draftContent === "string" ? draftContent.slice(0, 200) : playbook.description,
          trigger_source: context.triggeredBy.type,
          trigger_evidence: {
            playbook_slug: playbook.slug,
            triggered_by: context.triggeredBy,
            voice: context.voice?.slug,
          },
          context_inputs: {
            draft: draftContent,
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
        trigger_evidence: {
          playbook_slug: playbook.slug,
          triggered_by: context.triggeredBy,
        },
        context_inputs: {
          briefing: draftContent,
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
