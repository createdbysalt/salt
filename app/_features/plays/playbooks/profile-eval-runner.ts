import { evaluatePersonProfileFields } from "./profile/apply-person-profile";
import { evaluateOrgProfileFields, ORG_PROFILE_SLUG } from "./profile/apply-org-profile";
import { evaluateWorkProfileFields, WORK_PROFILE_SLUG } from "./profile/apply-work-profile";
import type { ProfileFieldResult, ProfileFillRulesDocument } from "./profile/types";
import {
  classifyEntity,
  evaluateAdmission,
  resolveIdentity,
  type ExistingPersonCandidate,
  type RecordsDecision,
} from "@/app/_features/people/records-engine";
import type {
  PlaybookEvalAssertion,
  PlaybookEvalCase,
  PlaybookEvalResult,
  PlaybookBenchmarkResult,
} from "./types";

type ProfileEvaluation = {
  results: ProfileFieldResult[];
  values: Record<string, string | null>;
};

function toEvaluationValues(result: ReturnType<typeof evaluatePersonProfileFields>): ProfileEvaluation {
  return {
    results: result.results,
    values: {
      relationship_type: result.relationshipType,
      title: result.title,
      org_link: result.orgDomain,
    },
  };
}

function evaluateProfileAssertion(
  assertion: PlaybookEvalAssertion,
  evaluation: ProfileEvaluation,
  decision: RecordsDecision,
): { passed: boolean; detail: string } {
  if (assertion.type === "field_value_eq") {
    const field = assertion.field ?? "relationship_type";
    const expected = assertion.expected ?? "";
    const actual = evaluation.values[field] ?? null;
    const passed = (actual ?? "") === expected;
    return {
      passed,
      detail: passed
        ? `${field} is ${expected}`
        : `expected ${field}=${expected}, got ${actual ?? "null"}`,
    };
  }

  if (assertion.type === "field_status_eq") {
    const field = assertion.field ?? "relationship_type";
    const expected = assertion.expected ?? "";
    const match = evaluation.results.find((item) => item.field === field);
    const actual = match?.status ?? null;
    const passed = actual === expected;
    return {
      passed,
      detail: passed
        ? `${field} status is ${expected}`
        : `expected ${field} status=${expected}, got ${actual ?? "null"}`,
    };
  }

  if (assertion.type === "field_source_eq") {
    const field = assertion.field ?? "relationship_type";
    const expected = assertion.expected ?? "";
    const match = evaluation.results.find((item) => item.field === field);
    const actual = match?.source ?? null;
    const passed = actual === expected;
    return {
      passed,
      detail: passed
        ? `${field} source is ${expected}`
        : `expected ${field} source=${expected}, got ${actual ?? "null"}`,
    };
  }

  if (assertion.type === "entity_classification_eq") {
    const expected = assertion.expected ?? "";
    const actual = decision.entityType;
    const passed = actual === expected;
    return {
      passed,
      detail: passed
        ? `entity classification is ${expected}`
        : `expected entity classification=${expected}, got ${actual}`,
    };
  }

  if (assertion.type === "admission_decision_eq") {
    const expected = assertion.expected ?? "";
    const actual = decision.action;
    const passed = actual === expected;
    return {
      passed,
      detail: passed
        ? `admission decision is ${expected}`
        : `expected admission decision=${expected}, got ${actual}`,
    };
  }

  return { passed: false, detail: `unsupported profile assertion: ${assertion.type}` };
}

function runProfileEvaluation(input: {
  playbookSlug: string;
  version: number;
  fillRules: ProfileFillRulesDocument;
  evalCase: PlaybookEvalCase;
}): ProfileEvaluation {
  const contextFacts = (input.evalCase.input.context_facts ?? {}) as {
    workspace_domains?: string[];
    partner_domains?: string[];
    vendor_domains?: string[];
  };
  const settings = {
    autoApplyThreshold: Number(input.evalCase.input.auto_apply_threshold ?? 85),
    aiFallbackEnabled: input.evalCase.input.ai_fallback_enabled !== false,
    contextFacts,
    fillRulesOverride: null,
    activeSections: input.fillRules.fields,
  };

  if (input.playbookSlug === ORG_PROFILE_SLUG) {
    const result = evaluateOrgProfileFields({
      name: String(input.evalCase.input.name ?? "Acme"),
      domain:
        typeof input.evalCase.input.domain === "string"
          ? input.evalCase.input.domain
          : null,
      website:
        typeof input.evalCase.input.website === "string"
          ? input.evalCase.input.website
          : null,
      industry:
        typeof input.evalCase.input.industry === "string"
          ? input.evalCase.input.industry
          : null,
      keyContactId:
        typeof input.evalCase.input.key_contact_id === "string"
          ? input.evalCase.input.key_contact_id
          : null,
      signals: input.evalCase.input.signals as Parameters<typeof evaluateOrgProfileFields>[0]["signals"],
      systemRules: input.fillRules,
      settings,
      blueprintVersion: input.version,
    });
    return {
      results: result.results,
      values: {
        website: result.website,
        industry: result.industry,
        relationship_status: result.relationshipStatus,
        key_contact: result.keyContactId,
      },
    };
  }

  if (input.playbookSlug === WORK_PROFILE_SLUG) {
    const result = evaluateWorkProfileFields({
      name: String(input.evalCase.input.name ?? "Website redesign"),
      currentStatus:
        typeof input.evalCase.input.current_status === "string"
          ? input.evalCase.input.current_status
          : null,
      currentProjectType:
        typeof input.evalCase.input.current_project_type === "string"
          ? input.evalCase.input.current_project_type
          : null,
      currentDescription:
        typeof input.evalCase.input.current_description === "string"
          ? input.evalCase.input.current_description
          : null,
      currentDeadline:
        typeof input.evalCase.input.current_deadline === "string"
          ? input.evalCase.input.current_deadline
          : null,
      currentStartDate:
        typeof input.evalCase.input.current_start_date === "string"
          ? input.evalCase.input.current_start_date
          : null,
      signals: input.evalCase.input.signals as Parameters<typeof evaluateWorkProfileFields>[0]["signals"],
      systemRules: input.fillRules,
      settings,
      blueprintVersion: input.version,
    });
    return {
      results: result.results,
      values: {
        status: result.status,
        project_type: result.projectType,
        description: result.description,
        deadline: result.deadline,
        start_date: result.startDate,
      },
    };
  }

  const facts = input.evalCase.input.signals as Record<string, unknown> | undefined;
  const email = String(input.evalCase.input.email ?? "test@example.com");
  const extractedTitle =
    typeof input.evalCase.input.extracted_title === "string"
      ? input.evalCase.input.extracted_title
      : null;
  return toEvaluationValues(
    evaluatePersonProfileFields({
      email,
      signals: facts as Parameters<typeof evaluatePersonProfileFields>[0]["signals"],
      extractedTitle,
      systemRules: input.fillRules,
      settings,
      blueprintVersion: input.version,
    }),
  );
}

export function runProfilePlaybookBenchmark(input: {
  playbook_slug: string;
  version: number;
  fill_rules: ProfileFillRulesDocument;
  evals: PlaybookEvalCase[];
}): PlaybookBenchmarkResult {
  const results: PlaybookEvalResult[] = input.evals.map((evalCase) => {
    const facts = evalCase.input.signals as Record<string, unknown> | undefined;
    const email = String(evalCase.input.email ?? "test@example.com");
    const existingPeople = Array.isArray(evalCase.input.existing_people)
      ? (evalCase.input.existing_people as ExistingPersonCandidate[])
      : [];
    const recordsInput = {
      name: typeof evalCase.input.name === "string" ? evalCase.input.name : undefined,
      email,
      organizationName:
        typeof evalCase.input.organization_name === "string"
          ? evalCase.input.organization_name
          : undefined,
      domain: typeof evalCase.input.domain === "string" ? evalCase.input.domain : undefined,
      explicitRequest: Boolean(evalCase.input.explicit_request),
      userInsistsPerson: Boolean(evalCase.input.user_insists_person),
      signals: facts as Parameters<typeof evaluatePersonProfileFields>[0]["signals"],
    };
    const classification = classifyEntity(recordsInput);
    const duplicates = resolveIdentity({ recordsInput, candidates: existingPeople });
    const decision = evaluateAdmission({ recordsInput, classification, duplicates });

    const evaluation = runProfileEvaluation({
      playbookSlug: input.playbook_slug,
      version: input.version,
      fillRules: input.fill_rules,
      evalCase,
    });

    const evidence: string[] = [];
    let passed = true;
    for (const assertion of evalCase.assertions) {
      const outcome = evaluateProfileAssertion(assertion, evaluation, decision);
      evidence.push(outcome.detail);
      if (!outcome.passed) passed = false;
    }

    return {
      eval_id: evalCase.id,
      eval_name: evalCase.name,
      passed,
      evidence,
    };
  });

  const passed = results.filter((r) => r.passed).length;
  return {
    playbook_slug: input.playbook_slug,
    version: input.version,
    passed,
    total: results.length,
    results,
  };
}
