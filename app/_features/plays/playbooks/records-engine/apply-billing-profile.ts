import { evaluateFieldFromRules } from "./evaluate-rules";
import { resolveProfileRules } from "./resolve-rules";
import type {
  BillingProfileFacts,
  BillingStatusValue,
  ProfileFieldResult,
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "./types";
import { defaultBillingProfileRules, resolveRuleSetValue } from "./validate-rules";

export const BILLING_PROFILE_SLUG = "memory-records";

function buildBillingFacts(input: {
  number: string;
  currentStatus?: string | null;
  currentOrganizationId?: string | null;
  currentPersonId?: string | null;
  currentWorkId?: string | null;
  signals?: Partial<BillingProfileFacts>;
}): BillingProfileFacts {
  return {
    billing_number: input.number,
    current_status: input.currentStatus ?? null,
    current_organization_id: input.currentOrganizationId ?? null,
    current_person_id: input.currentPersonId ?? null,
    current_work_id: input.currentWorkId ?? null,
    billing_payment_matched: Boolean(input.signals?.billing_payment_matched),
    billing_amount_paid_covers_total: Boolean(input.signals?.billing_amount_paid_covers_total),
    billing_due_date_passed: Boolean(input.signals?.billing_due_date_passed),
    billing_party_email_match: Boolean(input.signals?.billing_party_email_match),
    billing_party_customer_id_match: Boolean(input.signals?.billing_party_customer_id_match),
    inferred_organization_id: input.signals?.inferred_organization_id ?? null,
    inferred_person_id: input.signals?.inferred_person_id ?? null,
    inferred_work_id: input.signals?.inferred_work_id ?? null,
  };
}

export function evaluateBillingProfileFields(input: {
  number: string;
  currentStatus?: string | null;
  currentOrganizationId?: string | null;
  currentPersonId?: string | null;
  currentWorkId?: string | null;
  signals?: Partial<BillingProfileFacts>;
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
  blueprintVersion?: number;
}): {
  status: BillingStatusValue | null;
  organizationId: string | null;
  personId: string | null;
  workId: string | null;
  results: ProfileFieldResult[];
  blueprintSlug: string;
  blueprintVersion: number;
} {
  const resolved = resolveProfileRules({
    systemRules: input.systemRules,
    settings: input.settings,
    defaultRules: defaultBillingProfileRules(),
  });
  const facts = buildBillingFacts(input);
  const results: ProfileFieldResult[] = [];

  const fields = ["status", "organizationId", "personId", "workId"] as const;
  const values: {
    status: BillingStatusValue | null;
    organizationId: string | null;
    personId: string | null;
    workId: string | null;
  } = {
    status: null,
    organizationId: null,
    personId: null,
    workId: null,
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
    if (field === "status") values.status = value as BillingStatusValue | null;
    if (field === "organizationId") values.organizationId = value;
    if (field === "personId") values.personId = value;
    if (field === "workId") values.workId = value;

    results.push({
      field,
      value,
      confidence: ruleResult.confidence,
      because: ruleResult.because,
      source: ruleResult.source,
      ruleId: ruleResult.ruleId,
      status: value ? ruleResult.status : "pending",
      evidence: {
        billing_number: facts.billing_number,
        current_status: facts.current_status,
        signal: field,
      },
    });
  }

  return {
    ...values,
    results,
    blueprintSlug: BILLING_PROFILE_SLUG,
    blueprintVersion: input.blueprintVersion ?? 1,
  };
}
