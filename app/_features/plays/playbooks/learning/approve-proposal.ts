import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { validatePlayDefinition } from "../../utils/play-definition";
import {
  aggregateLearningSignals,
  buildImprovementProposalInput,
  synthesizePlaybookProposal,
} from "./synthesize-proposal";
import type { PlaybookEvalCase } from "../types";
import { getPlaybookBlueprint } from "../adopt-blueprint";

export async function synthesizePlaybookImprovementProposal(
  blueprintSlug: string,
): Promise<{ proposalId: string } | null> {
  const admin = createAdminClient();
  const blueprint = await getPlaybookBlueprint(blueprintSlug);
  if (!blueprint) return null;

  const { data: signals } = await admin
    .from("playbook_learning_signals")
    .select("signal_type, delta")
    .eq("blueprint_slug", blueprintSlug)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: evalRows } = await admin
    .from("playbook_evals")
    .select("eval_key, name, input, mocks, assertions")
    .eq("blueprint_slug", blueprintSlug);

  const evals: PlaybookEvalCase[] = (evalRows ?? []).map((row) => ({
    id: row.eval_key as string,
    name: row.name as string,
    input: (row.input as Record<string, unknown>) ?? {},
    mocks: (row.mocks as Record<string, unknown>) ?? {},
    assertions: (row.assertions as PlaybookEvalCase["assertions"]) ?? [],
  }));

  const synthesized = synthesizePlaybookProposal({
    blueprint_slug: blueprint.slug,
    from_version: blueprint.version,
    procedure_md: blueprint.procedure_md,
    definition: blueprint.definition,
    required_actions: blueprint.required_actions,
    signals: aggregateLearningSignals(
      (signals ?? []).map((row) => ({
        signal_type: row.signal_type as "edited" | "dismissed" | "failed" | "guard_skipped",
        delta: (row.delta as Record<string, unknown>) ?? {},
      })),
    ),
    evals,
  });

  if (!synthesized) return null;

  const validation = validatePlayDefinition(synthesized.proposed_definition);
  if (!validation.ok) return null;

  const proposalInput = buildImprovementProposalInput({
    blueprint_slug: blueprint.slug,
    from_version: blueprint.version,
    synthesized: {
      ...synthesized,
      proposed_required_actions: validation.requiredActions,
    },
  });

  const { data, error } = await admin
    .from("playbook_improvement_proposals")
    .insert({
      blueprint_slug: proposalInput.blueprint_slug,
      from_version: proposalInput.from_version,
      proposed_procedure_md: proposalInput.proposed_procedure_md,
      proposed_definition: proposalInput.proposed_definition,
      proposed_required_actions: proposalInput.proposed_required_actions,
      rationale: proposalInput.rationale,
      evidence: proposalInput.evidence,
      benchmark_delta: proposalInput.benchmark_delta,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return { proposalId: data.id as string };
}

export async function approvePlaybookImprovementProposal(input: {
  proposalId: string;
  reviewerUserId: string;
}): Promise<{ blueprintSlug: string; version: number }> {
  const admin = createAdminClient();

  const { data: proposal } = await admin
    .from("playbook_improvement_proposals")
    .select("*")
    .eq("id", input.proposalId)
    .eq("status", "pending")
    .maybeSingle();

  if (!proposal) {
    throw new Error("Improvement proposal not found or already reviewed");
  }

  const validation = validatePlayDefinition(proposal.proposed_definition);
  if (!validation.ok) {
    throw new Error(`Proposed definition invalid: ${validation.errors.join("; ")}`);
  }

  const { data: blueprint } = await admin
    .from("playbook_blueprints")
    .select("*")
    .eq("slug", proposal.blueprint_slug)
    .maybeSingle();

  if (!blueprint) {
    throw new Error("Blueprint not found");
  }

  const nextVersion = (blueprint.version as number) + 1;
  const now = new Date().toISOString();

  await admin.from("playbook_blueprint_versions").insert({
    blueprint_slug: proposal.blueprint_slug,
    version: blueprint.version,
    procedure_md: blueprint.procedure_md,
    definition: blueprint.definition,
    required_actions: blueprint.required_actions,
    value_model: blueprint.value_model,
    change_summary: proposal.rationale,
  });

  const { error: updateError } = await admin
    .from("playbook_blueprints")
    .update({
      procedure_md: proposal.proposed_procedure_md,
      definition: proposal.proposed_definition,
      required_actions: proposal.proposed_required_actions,
      version: nextVersion,
      updated_at: now,
    })
    .eq("slug", proposal.blueprint_slug);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await admin
    .from("playbook_improvement_proposals")
    .update({
      status: "approved",
      reviewed_by: input.reviewerUserId,
      reviewed_at: now,
    })
    .eq("id", input.proposalId);

  return {
    blueprintSlug: proposal.blueprint_slug as string,
    version: nextVersion,
  };
}
