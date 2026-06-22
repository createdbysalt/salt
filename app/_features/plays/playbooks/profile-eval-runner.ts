import { evaluatePersonProfileFields } from "./profile/apply-person-profile";
import type { ProfileFillRulesDocument } from "./profile/types";
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

function evaluateProfileAssertion(
  assertion: PlaybookEvalAssertion,
  result: ReturnType<typeof evaluatePersonProfileFields>,
  decision: RecordsDecision,
): { passed: boolean; detail: string } {
  if (assertion.type === "field_value_eq") {
    const field = assertion.field ?? "relationship_type";
    const expected = assertion.expected ?? "";
    let actual: string | null = null;
    if (field === "relationship_type") actual = result.relationshipType;
    if (field === "title") actual = result.title;
    if (field === "org_link") actual = result.orgDomain;
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
    const match = result.results.find((item) => item.field === field);
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
    const match = result.results.find((item) => item.field === field);
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

export function runProfilePlaybookBenchmark(input: {
  playbook_slug: string;
  version: number;
  fill_rules: ProfileFillRulesDocument;
  evals: PlaybookEvalCase[];
}): PlaybookBenchmarkResult {
  const results: PlaybookEvalResult[] = input.evals.map((evalCase) => {
    const facts = evalCase.input.signals as Record<string, unknown> | undefined;
    const email = String(evalCase.input.email ?? "test@example.com");
    const extractedTitle =
      typeof evalCase.input.extracted_title === "string"
        ? evalCase.input.extracted_title
        : null;

    const contextFacts = (evalCase.input.context_facts ?? {}) as {
      workspace_domains?: string[];
      partner_domains?: string[];
      vendor_domains?: string[];
    };
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

    const evaluation = evaluatePersonProfileFields({
      email,
      signals: facts as Parameters<typeof evaluatePersonProfileFields>[0]["signals"],
      extractedTitle,
      systemRules: input.fill_rules,
      settings: {
        autoApplyThreshold: Number(evalCase.input.auto_apply_threshold ?? 85),
        aiFallbackEnabled: evalCase.input.ai_fallback_enabled !== false,
        contextFacts,
        fillRulesOverride: null,
        activeSections: ["relationship_type", "title", "org_link"],
      },
      blueprintVersion: input.version,
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
