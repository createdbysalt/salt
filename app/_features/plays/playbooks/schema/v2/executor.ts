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
  VoiceProfile,
} from "./types";
import {
  checkCategoryRequirements,
  fetchMultipleByCategory,
  getConnectedCategories,
  getCategoryCapabilities,
} from "@/app/_lib/composio/category-fetcher";
import { createAdminClient } from "@/app/_lib/supabase/admin";

function getStepId(step: PlaybookStep, fallback: string): string {
  return "id" in step && typeof step.id === "string" ? step.id : fallback;
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
}

export interface StepResult {
  stepId: string;
  status: "success" | "skipped" | "error";
  data?: unknown;
  error?: string;
}

export interface ExecutionResultV2 {
  status: "success" | "skipped" | "error";
  playbookSlug: string;
  layer: "learn" | "act";
  reason?: string;
  stepResults: StepResult[];
  outputCount?: number;
  playRunIds?: string[];
  durationMs: number;
}

export async function buildExecutionContextV2(
  workspaceId: string,
  userId: string,
  triggeredBy: ExecutionContextV2["triggeredBy"],
  voiceSlug?: string
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
      const result = await executeStep(step, context, stepData);
      stepResults.push(result);

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
  stepData: Map<string, unknown>
): Promise<StepResult> {
  switch (step.step) {
    case "fetch":
      return executeFetchStep(step, context);
    case "classify":
      return executeClassifyStep(step, stepData);
    case "draft":
      return executeDraftStep(step, context, stepData);
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
  context: ExecutionContextV2
): Promise<StepResult> {
  try {
    const [category, capability] = step.from.split(".");

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
        filter: step.where,
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
    const { sendLlm } = await import("@/app/_lib/ai/gpt");

    const result = await sendLlm(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      context.userId,
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

function interpolatePrompt(
  template: string,
  stepData: Map<string, unknown>,
  context: ExecutionContextV2
): string {
  let result = template;

  const varPattern = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = varPattern.exec(template)) !== null) {
    const varPath = match[1].trim();
    let value: unknown;

    if (varPath.startsWith("context.")) {
      value = getNestedValue(context as unknown as Record<string, unknown>, varPath.slice(8));
    } else {
      const [stepId, ...rest] = varPath.split(".");
      const stepResult = stepData.get(stepId);
      if (rest.length > 0 && stepResult != null) {
        value = getNestedValue(stepResult as Record<string, unknown>, rest.join("."));
      } else {
        value = stepResult;
      }
    }

    result = result.replace(match[0], String(value ?? ""));
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
