import type { PlayDefinition } from "../../utils/play-definition";
import { runPlaybookBenchmark } from "../eval-runner";
import type {
  PlaybookEvalCase,
  PlaybookImprovementProposalInput,
  PlaybookLearningSignalType,
} from "../types";

export interface LearningSignalAggregate {
  signal_type: PlaybookLearningSignalType;
  count: number;
  samples: Record<string, unknown>[];
}

export interface SynthesizedPlaybookProposal {
  rationale: string;
  proposed_procedure_md: string;
  proposed_definition: PlayDefinition;
  proposed_required_actions: string[];
  evidence: Record<string, unknown>[];
  benchmark_delta: Record<string, unknown>;
}

/**
 * Heuristic synthesizer (v1): aggregates learning signals into a proposal draft.
 * A future LLM step can replace the body while keeping the benchmark gate.
 */
export function synthesizePlaybookProposal(input: {
  blueprint_slug: string;
  from_version: number;
  procedure_md: string;
  definition: PlayDefinition;
  required_actions: string[];
  signals: LearningSignalAggregate[];
  evals: PlaybookEvalCase[];
}): SynthesizedPlaybookProposal | null {
  const editSignals = input.signals.find((s) => s.signal_type === "edited");
  const guardSkips = input.signals.find((s) => s.signal_type === "guard_skipped");
  const failures = input.signals.find((s) => s.signal_type === "failed");

  if (!editSignals && !guardSkips && !failures) {
    return null;
  }

  let rationale = "";
  let proposed_procedure_md = input.procedure_md;
  const proposed_definition = structuredClone(input.definition);
  const evidence: Record<string, unknown>[] = [];

  if (editSignals && editSignals.count >= 3) {
    rationale += `Users edited draft body on ${editSignals.count} recent runs. `;
    proposed_procedure_md += `\n\n## Learned preference\n\nKeep follow-ups shorter and lead with context from the last thread.\n`;
    evidence.push(...editSignals.samples.slice(0, 3));
  }

  if (guardSkips && guardSkips.count >= 5) {
    rationale += `Guard skipped ${guardSkips.count} runs — trigger may be too aggressive. `;
    evidence.push(...guardSkips.samples.slice(0, 3));
  }

  if (failures && failures.count >= 2) {
    rationale += `${failures.count} execution failures recorded. `;
    evidence.push(...failures.samples.slice(0, 3));
  }

  if (!rationale) return null;

  const currentBench = runPlaybookBenchmark({
    playbook_slug: input.blueprint_slug,
    version: input.from_version,
    definition: input.definition,
    evals: input.evals,
  });

  const proposedBench = runPlaybookBenchmark({
    playbook_slug: input.blueprint_slug,
    version: input.from_version + 1,
    definition: proposed_definition,
    evals: input.evals,
  });

  return {
    rationale: rationale.trim(),
    proposed_procedure_md,
    proposed_definition,
    proposed_required_actions: input.required_actions,
    evidence,
    benchmark_delta: {
      before: { passed: currentBench.passed, total: currentBench.total },
      after: { passed: proposedBench.passed, total: proposedBench.total },
    },
  };
}

export function buildImprovementProposalInput(input: {
  blueprint_slug: string;
  from_version: number;
  synthesized: SynthesizedPlaybookProposal;
}): PlaybookImprovementProposalInput {
  return {
    blueprint_slug: input.blueprint_slug,
    from_version: input.from_version,
    proposed_procedure_md: input.synthesized.proposed_procedure_md,
    proposed_definition: input.synthesized.proposed_definition,
    proposed_required_actions: input.synthesized.proposed_required_actions,
    rationale: input.synthesized.rationale,
    evidence: input.synthesized.evidence,
    benchmark_delta: input.synthesized.benchmark_delta,
  };
}

export function aggregateLearningSignals(
  rows: Array<{ signal_type: PlaybookLearningSignalType; delta: Record<string, unknown> }>,
): LearningSignalAggregate[] {
  const map = new Map<PlaybookLearningSignalType, LearningSignalAggregate>();

  for (const row of rows) {
    const existing = map.get(row.signal_type) ?? {
      signal_type: row.signal_type,
      count: 0,
      samples: [],
    };
    existing.count += 1;
    if (existing.samples.length < 5) {
      existing.samples.push(row.delta);
    }
    map.set(row.signal_type, existing);
  }

  return [...map.values()];
}
