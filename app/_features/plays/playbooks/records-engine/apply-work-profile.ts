import { evaluateFieldFromRules } from "./evaluate-rules";
import { resolveProfileRules } from "./resolve-rules";
import type {
  ProfileFieldResult,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
  WorkProfileFacts,
  WorkStatusValue,
} from "./types";
import { defaultWorkProfileRules, resolveRuleSetValue } from "./validate-rules";

export const WORK_PROFILE_SLUG = "memory-records";

function buildWorkFacts(input: {
  name: string;
  currentStatus?: string | null;
  currentDescription?: string | null;
  currentDeadline?: string | null;
  currentStartDate?: string | null;
  signals?: Partial<WorkProfileFacts>;
}): WorkProfileFacts {
  return {
    work_name: input.name,
    current_status: input.currentStatus ?? null,
    current_description: input.currentDescription ?? null,
    current_deadline: input.currentDeadline ?? null,
    current_start_date: input.currentStartDate ?? null,
    inferred_description: input.signals?.inferred_description ?? input.currentDescription ?? null,
    inferred_deadline: input.signals?.inferred_deadline ?? input.currentDeadline ?? null,
    inferred_start_date: input.signals?.inferred_start_date ?? input.currentStartDate ?? null,
    work_created: Boolean(input.signals?.work_created),
    work_has_signed_contract: Boolean(input.signals?.work_has_signed_contract),
    work_has_kickoff: Boolean(input.signals?.work_has_kickoff),
    work_is_blocked: Boolean(input.signals?.work_is_blocked),
    work_has_completed_deliverable: Boolean(input.signals?.work_has_completed_deliverable),
    work_has_due_date: Boolean(input.signals?.work_has_due_date ?? input.currentDeadline),
  };
}

export function evaluateWorkProfileFields(input: {
  name: string;
  currentStatus?: string | null;
  currentDescription?: string | null;
  currentDeadline?: string | null;
  currentStartDate?: string | null;
  signals?: Partial<WorkProfileFacts>;
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
  blueprintVersion?: number;
}): {
  status: WorkStatusValue | null;
  description: string | null;
  deadline: string | null;
  startDate: string | null;
  results: ProfileFieldResult[];
  blueprintSlug: string;
  blueprintVersion: number;
} {
  const resolved = resolveProfileRules({
    systemRules: input.systemRules,
    settings: input.settings,
    defaultRules: defaultWorkProfileRules(),
  });
  const facts = buildWorkFacts(input);
  const results: ProfileFieldResult[] = [];

  const fields = ["status", "description", "deadline", "start_date"] as const;
  const values: {
    status: WorkStatusValue | null;
    description: string | null;
    deadline: string | null;
    startDate: string | null;
  } = {
    status: null,
    description: null,
    deadline: null,
    startDate: null,
  };

  for (const field of fields) {
    const ruleResult = evaluateFieldFromRules({
      field,
      rules: resolved.rules.rules,
      facts,
      context: resolved.context,
      autoApplyThreshold: resolved.autoApplyThreshold,
    });
    if (!ruleResult) continue;

    const value = resolveRuleSetValue(ruleResult.value ?? "", facts);
    if (field === "status") values.status = value as WorkStatusValue | null;
    if (field === "description") values.description = value;
    if (field === "deadline") values.deadline = value;
    if (field === "start_date") values.startDate = value;

    results.push({
      field,
      value,
      confidence: ruleResult.confidence,
      because: ruleResult.because,
      source: ruleResult.source,
      ruleId: ruleResult.ruleId,
      status: value ? ruleResult.status : "pending",
      evidence: {
        work_name: facts.work_name,
        current_status: facts.current_status,
        signal: field,
      },
    });
  }

  return {
    ...values,
    results,
    blueprintSlug: WORK_PROFILE_SLUG,
    blueprintVersion: input.blueprintVersion ?? 1,
  };
}
