import {
  evaluateGuard,
  interpolateParams,
  renderTemplate,
  resolvePath,
  type PlayDefinition,
  type PlayLlmStep,
  type PlayStep,
  type StepContext,
} from "../utils/play-definition";
import type {
  PlaybookEvalAssertion,
  PlaybookEvalCase,
  PlaybookEvalResult,
  PlaybookBenchmarkResult,
} from "./types";

export interface SimulatedPlayRun {
  context: StepContext;
  executedActs: string[];
  guardSkipped: boolean;
  error?: string;
}

export interface SimulatePlayOptions {
  definition: PlayDefinition;
  input: Record<string, unknown>;
  mocks?: Record<string, unknown>;
  llmStub?: (step: PlayLlmStep, inputs: Record<string, unknown>) => string;
}

const defaultLlmStub = (step: PlayLlmStep): string =>
  `[personalized:${step.purpose}] ${step.instructions.slice(0, 120)}`;

export function simulatePlayDefinition(options: SimulatePlayOptions): SimulatedPlayRun {
  const { definition, input, mocks = {}, llmStub = defaultLlmStub } = options;
  const context: StepContext = { ...input };
  const executedActs: string[] = [];
  let guardSkipped = false;

  for (const step of definition.steps) {
    if (guardSkipped) break;

    try {
      if (step.kind === "guard") {
        if (!evaluateGuard(step, context)) {
          guardSkipped = true;
          break;
        }
        continue;
      }

      if (step.kind === "fetch") {
        const mock = mocks[step.tool];
        context[step.bind] = mock ?? { mocked: true, tool: step.tool };
        continue;
      }

      if (step.kind === "render") {
        context[step.bind] = renderTemplate(step.template, context);
        continue;
      }

      if (step.kind === "llm") {
        const inputs = Object.fromEntries(
          step.inputs.map((path) => [path, resolvePath(context, path)]),
        );
        context[step.bind] = llmStub(step, inputs);
        continue;
      }

      if (step.kind === "act") {
        interpolateParams(step.params, context);
        executedActs.push(step.tool);
      }
    } catch (error) {
      return {
        context,
        executedActs,
        guardSkipped,
        error: error instanceof Error ? error.message : "Simulation failed",
      };
    }
  }

  return { context, executedActs, guardSkipped };
}

function evaluateAssertion(
  assertion: PlaybookEvalAssertion,
  run: SimulatedPlayRun,
): { passed: boolean; evidence: string } {
  switch (assertion.type) {
    case "bound_contains": {
      const value = assertion.bind ? run.context[assertion.bind] : undefined;
      const text = String(value ?? "");
      const passed = assertion.substring ? text.includes(assertion.substring) : text.length > 0;
      return {
        passed,
        evidence: passed
          ? `bind "${assertion.bind}" contains "${assertion.substring}"`
          : `bind "${assertion.bind}" missing substring "${assertion.substring}"`,
      };
    }
    case "bound_exists": {
      const value = assertion.bind ? run.context[assertion.bind] : undefined;
      const passed = value !== undefined && value !== null;
      return {
        passed,
        evidence: passed
          ? `bind "${assertion.bind}" exists`
          : `bind "${assertion.bind}" is missing`,
      };
    }
    case "context_path_eq": {
      const actual = assertion.path ? resolvePath(run.context, assertion.path) : undefined;
      const passed = actual === assertion.value;
      return {
        passed,
        evidence: passed
          ? `${assertion.path} === ${String(assertion.value)}`
          : `${assertion.path} is ${String(actual)}, expected ${String(assertion.value)}`,
      };
    }
    case "context_path_gte": {
      const actual = Number(assertion.path ? resolvePath(run.context, assertion.path) : NaN);
      const expected = Number(assertion.value);
      const passed = !Number.isNaN(actual) && actual >= expected;
      return {
        passed,
        evidence: passed
          ? `${assertion.path} (${actual}) >= ${expected}`
          : `${assertion.path} (${actual}) < ${expected}`,
      };
    }
    case "act_executed": {
      const passed = assertion.tool
        ? run.executedActs.includes(assertion.tool)
        : run.executedActs.length > 0;
      return {
        passed,
        evidence: passed
          ? `act ${assertion.tool ?? "any"} executed`
          : `act ${assertion.tool ?? "any"} not executed (got: ${run.executedActs.join(", ") || "none"})`,
      };
    }
    case "no_act_executed": {
      const passed = run.executedActs.length === 0;
      return {
        passed,
        evidence: passed
          ? "no external act executed"
          : `unexpected acts: ${run.executedActs.join(", ")}`,
      };
    }
    case "guard_skipped": {
      const passed = run.guardSkipped;
      return {
        passed,
        evidence: passed ? "guard skipped run as expected" : "guard did not skip run",
      };
    }
    case "field_value_eq":
    case "field_status_eq":
    case "field_source_eq":
    case "entity_classification_eq":
    case "admission_decision_eq":
      return {
        passed: false,
        evidence: `${assertion.type} is evaluated by profile benchmark runner`,
      };
    default: {
      const _exhaustive: never = assertion.type;
      return { passed: false, evidence: `unknown assertion type: ${_exhaustive}` };
    }
  }
}

export function runPlaybookEval(
  definition: PlayDefinition,
  evalCase: PlaybookEvalCase,
): PlaybookEvalResult {
  const run = simulatePlayDefinition({
    definition,
    input: evalCase.input,
    mocks: evalCase.mocks,
    llmStub: (step) => evalCase.llmOutputs?.[step.bind] ?? defaultLlmStub(step),
  });

  const evidence: string[] = [];
  if (run.error) {
    return {
      eval_id: evalCase.id,
      eval_name: evalCase.name,
      passed: false,
      evidence: [`simulation error: ${run.error}`],
    };
  }

  let passed = true;
  for (const assertion of evalCase.assertions) {
    const result = evaluateAssertion(assertion, run);
    evidence.push(result.evidence);
    if (!result.passed) passed = false;
  }

  return {
    eval_id: evalCase.id,
    eval_name: evalCase.name,
    passed,
    evidence,
  };
}

export function runPlaybookBenchmark(input: {
  playbook_slug: string;
  version: number;
  definition: PlayDefinition;
  evals: PlaybookEvalCase[];
}): PlaybookBenchmarkResult {
  const results = input.evals.map((evalCase) =>
    runPlaybookEval(input.definition, evalCase),
  );
  const passed = results.filter((r) => r.passed).length;

  return {
    playbook_slug: input.playbook_slug,
    version: input.version,
    passed,
    total: results.length,
    results,
  };
}

export function countActSteps(definition: PlayDefinition): number {
  return definition.steps.filter((step: PlayStep) => step.kind === "act").length;
}
