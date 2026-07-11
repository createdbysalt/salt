import type { PlayDefinition, PlayLlmStep, StepContext } from "../utils/play-definition";
import {
  evaluateGuard,
  interpolateParams,
  renderTemplate,
  resolvePath,
  validatePlayDefinition,
} from "../utils/play-definition";

/**
 * Dry-run executor for user playbook previews.
 *
 * Executes fetch/guard/llm/render steps with act steps suppressed.
 * Used as the activation gate for user-created playbooks (Phase 3) —
 * users see what the playbook would produce before enabling it.
 *
 * Unlike the real executor, this:
 * - Never executes act steps (logs what would be called)
 * - Runs without claiming a play_run row
 * - Uses mock/sample data for fetch steps when no real data available
 * - Returns bound context values as the preview output
 */

export interface DryRunStepResult {
  index: number;
  kind: string;
  status: "completed" | "skipped" | "would_act";
  boundName?: string;
  boundValue?: unknown;
  detail?: string;
}

export interface DryRunDeps {
  /** Execute a read-only fetch tool (optional — returns null if not wired). */
  executeFetchTool?(
    toolSlug: string,
    params: Record<string, unknown>,
    workspaceId: string,
  ): Promise<unknown>;
  /** Run an LLM step for preview (optional — returns placeholder if not wired). */
  runLlmStep?(
    step: PlayLlmStep,
    inputs: Record<string, unknown>,
    workspaceId: string,
  ): Promise<string>;
}

export type DryRunResult =
  | {
      ok: true;
      steps: DryRunStepResult[];
      context: StepContext;
      actStepsWouldRun: number;
      guardsPassed: boolean;
    }
  | { ok: false; error: string };

export async function dryRunPlaybook(
  definition: unknown,
  sampleInputs: Record<string, unknown>,
  workspaceId: string,
  deps: DryRunDeps = {},
): Promise<DryRunResult> {
  const validation = validatePlayDefinition(definition);
  if (!validation.ok) {
    return { ok: false, error: validation.errors.join("; ") };
  }

  const def = validation.definition;
  const context: StepContext = {
    ...sampleInputs,
    run: {
      title: sampleInputs.title ?? "Preview run",
      recipient_label: sampleInputs.recipientLabel ?? "Sample Recipient",
      preview: sampleInputs.preview ?? null,
      channel: sampleInputs.channel ?? "Gmail",
    },
  };

  const steps: DryRunStepResult[] = [];
  let actStepsWouldRun = 0;
  let guardsPassed = true;

  for (let index = 0; index < def.steps.length; index += 1) {
    const step = def.steps[index];

    if (step.kind === "guard") {
      const passed = evaluateGuard(step, context);
      if (!passed) {
        guardsPassed = false;
        steps.push({
          index,
          kind: "guard",
          status: "skipped",
          detail: `Guard not met: ${step.path} ${step.op}${step.value !== undefined ? ` ${String(step.value)}` : ""}`,
        });
        break;
      }
      steps.push({
        index,
        kind: "guard",
        status: "completed",
        detail: `Guard passed: ${step.path} ${step.op}`,
      });
      continue;
    }

    if (step.kind === "fetch") {
      let result: unknown = null;
      const toolSlug = step.tool ?? step.capability;

      if (deps.executeFetchTool && step.tool) {
        try {
          const params = interpolateParams(step.params, context);
          result = await deps.executeFetchTool(step.tool, params, workspaceId);
        } catch {
          result = { _preview: true, _error: "Fetch failed in preview" };
        }
      } else {
        result = { _preview: true, _note: `Would fetch from ${toolSlug}` };
      }

      context[step.bind] = result;
      steps.push({
        index,
        kind: "fetch",
        status: "completed",
        boundName: step.bind,
        boundValue: result,
        detail: `Fetched from ${toolSlug}`,
      });
      continue;
    }

    if (step.kind === "render") {
      try {
        const rendered = renderTemplate(step.template, context);
        context[step.bind] = rendered;
        steps.push({
          index,
          kind: "render",
          status: "completed",
          boundName: step.bind,
          boundValue: rendered,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Render failed";
        steps.push({
          index,
          kind: "render",
          status: "skipped",
          boundName: step.bind,
          detail: message,
        });
      }
      continue;
    }

    if (step.kind === "llm") {
      let text: string;
      if (deps.runLlmStep) {
        const inputs = Object.fromEntries(
          step.inputs.map((path) => [path, resolvePath(context, path)]),
        );
        text = await deps.runLlmStep(step, inputs, workspaceId);
      } else {
        text = `[LLM would generate: ${step.purpose}]`;
      }
      context[step.bind] = text;
      steps.push({
        index,
        kind: "llm",
        status: "completed",
        boundName: step.bind,
        boundValue: text,
        detail: step.purpose,
      });
      continue;
    }

    if (step.kind === "act") {
      const toolSlug = step.tool ?? step.capability;
      actStepsWouldRun += 1;
      try {
        const params = interpolateParams(step.params, context);
        steps.push({
          index,
          kind: "act",
          status: "would_act",
          detail: `Would execute ${toolSlug}`,
          boundValue: params,
        });
      } catch {
        steps.push({
          index,
          kind: "act",
          status: "would_act",
          detail: `Would execute ${toolSlug} (params not resolvable in preview)`,
        });
      }
    }
  }

  return {
    ok: true,
    steps,
    context,
    actStepsWouldRun,
    guardsPassed,
  };
}
