import type { PersonSignals } from "@/app/_features/memory/records/person-signals";
import {
  extractDomain,
  isPersonalDomain,
} from "@/app/_features/memory/records/person-signals";
import type {
  PersonProfileFacts,
  ProfileFacts,
  ProfileContextFacts,
  ProfileFillRule,
  ProfileRuleCondition,
  ProfileSignalKey,
} from "./types";

export function personSignalsToFacts(
  email: string,
  signals?: PersonSignals,
  extras?: { extracted_title?: string | null },
): PersonProfileFacts {
  return {
    email,
    has_payment_received:
      signals?.has_payment_received ?? signals?.has_stripe_payment,
    has_stripe_payment: signals?.has_stripe_payment,
    has_invoice_sent: signals?.has_invoice_sent,
    is_bidirectional_thread: signals?.is_bidirectional_thread,
    you_initiated: signals?.you_initiated,
    has_calendar_meeting: signals?.has_calendar_meeting,
    has_signature: signals?.has_signature,
    email_count: signals?.email_count,
    extracted_title: extras?.extracted_title ?? null,
    org_domain: extractDomain(email),
  };
}

function resolveSignalValue(
  signal: ProfileSignalKey,
  facts: ProfileFacts,
  context: ProfileContextFacts,
): string | number | boolean | null | undefined {
  switch (signal) {
    case "has_stripe_payment":
      return Boolean(facts.has_stripe_payment);
    case "has_payment_received":
      return Boolean(facts.has_payment_received);
    case "has_invoice_sent":
      return Boolean(facts.has_invoice_sent);
    case "is_bidirectional_thread":
      return Boolean(facts.is_bidirectional_thread);
    case "you_initiated":
      return Boolean(facts.you_initiated);
    case "has_calendar_meeting":
      return Boolean(facts.has_calendar_meeting);
    case "has_signature":
      return Boolean(facts.has_signature);
    case "email_count":
      return facts.email_count ?? 0;
    case "email_domain_is_personal":
      return typeof facts.email === "string" ? isPersonalDomain(facts.email) : false;
    case "email_domain_matches_workspace": {
      const email = typeof facts.email === "string" ? facts.email : "";
      const domain = typeof facts.org_domain === "string" ? facts.org_domain : extractDomain(email);
      if (!domain) return false;
      return (context.workspace_domains ?? []).includes(domain);
    }
    case "email_domain_in_partner_list": {
      const email = typeof facts.email === "string" ? facts.email : "";
      const domain = typeof facts.org_domain === "string" ? facts.org_domain : extractDomain(email);
      if (!domain) return false;
      return (context.partner_domains ?? []).includes(domain);
    }
    case "email_domain_in_vendor_list": {
      const email = typeof facts.email === "string" ? facts.email : "";
      const domain = typeof facts.org_domain === "string" ? facts.org_domain : extractDomain(email);
      if (!domain) return false;
      return (context.vendor_domains ?? []).includes(domain);
    }
    default:
      return facts[signal];
  }
}

function evaluateCondition(
  condition: ProfileRuleCondition,
  facts: ProfileFacts,
  context: ProfileContextFacts,
): boolean {
  const actual = resolveSignalValue(condition.signal, facts, context);

  switch (condition.op) {
    case "exists":
      return actual !== null && actual !== undefined && actual !== false && actual !== "";
    case "not_exists":
      return actual === null || actual === undefined || actual === false || actual === "";
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "gte":
      return typeof actual === "number" && typeof condition.value === "number"
        ? actual >= condition.value
        : false;
    default:
      return false;
  }
}

export function findMatchingRule(
  field: ProfileFillRule["field"],
  rules: ProfileFillRule[],
  facts: ProfileFacts,
  context: ProfileContextFacts,
): ProfileFillRule | null {
  for (const rule of rules) {
    if (rule.field !== field) continue;
    if (evaluateCondition(rule.when, facts, context)) {
      return rule;
    }
  }
  return null;
}

export function evaluateFieldFromRules(input: {
  field: ProfileFillRule["field"];
  rules: ProfileFillRule[];
  facts: ProfileFacts;
  context: ProfileContextFacts;
  autoApplyThreshold: number;
}): {
  value: string | null;
  confidence: number;
  because: string;
  source: "rule";
  ruleId: string | null;
  status: "applied" | "pending";
} | null {
  const rule = findMatchingRule(input.field, input.rules, input.facts, input.context);
  if (!rule) return null;

  const status =
    rule.confidence >= input.autoApplyThreshold ? ("applied" as const) : ("pending" as const);

  return {
    value: rule.set.value,
    confidence: rule.confidence,
    because: rule.because,
    source: "rule",
    ruleId: rule.id,
    status,
  };
}
