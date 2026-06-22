import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import {
  PROFILE_RELATIONSHIP_VALUES,
  PROFILE_SIGNAL_OPS,
  type ProfileFillRule,
  type ProfileFillRulesDocument,
  type ProfileFieldKey,
  type ProfileSignalKey,
} from "./types";

const ALLOWED_FIELDS: ProfileFieldKey[] = ["relationship_type", "title", "org_link"];

const ALLOWED_SIGNALS: ProfileSignalKey[] = [
  "has_payment_received",
  "has_stripe_payment",
  "has_invoice_sent",
  "is_bidirectional_thread",
  "you_initiated",
  "has_calendar_meeting",
  "has_signature",
  "email_count",
  "email_domain_is_personal",
  "email_domain_matches_workspace",
  "email_domain_in_partner_list",
  "email_domain_in_vendor_list",
];

const RELATIONSHIP_SET_VALUES = new Set<string>(PROFILE_RELATIONSHIP_VALUES);

export type ProfileRulesValidation =
  | { ok: true; document: ProfileFillRulesDocument }
  | { ok: false; errors: string[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateProfileRules(input: unknown): ProfileRulesValidation {
  const errors: string[] = [];

  if (!isObject(input)) {
    return { ok: false, errors: ["fill_rules must be an object"] };
  }

  const version = input.version;
  if (typeof version !== "number" || version !== 1) {
    errors.push("fill_rules.version must be 1");
  }

  const rulesRaw = input.rules;
  if (!Array.isArray(rulesRaw) || rulesRaw.length === 0) {
    errors.push("fill_rules.rules must be a non-empty array");
  }

  const rules: ProfileFillRule[] = [];
  const ruleList = Array.isArray(rulesRaw) ? rulesRaw : [];

  for (const [index, rawRule] of ruleList.entries()) {
    if (!isObject(rawRule)) {
      errors.push(`rules[${index}] must be an object`);
      continue;
    }

    const id = rawRule.id;
    if (typeof id !== "string" || !id.trim()) {
      errors.push(`rules[${index}].id is required`);
    }

    const field = rawRule.field;
    if (typeof field !== "string" || !ALLOWED_FIELDS.includes(field as ProfileFieldKey)) {
      errors.push(`rules[${index}].field must be one of: ${ALLOWED_FIELDS.join(", ")}`);
    }

    const when = rawRule.when;
    if (!isObject(when)) {
      errors.push(`rules[${index}].when must be an object`);
    } else {
      if (
        typeof when.signal !== "string" ||
        !ALLOWED_SIGNALS.includes(when.signal as ProfileSignalKey)
      ) {
        errors.push(`rules[${index}].when.signal is invalid`);
      }
      if (
        typeof when.op !== "string" ||
        !PROFILE_SIGNAL_OPS.includes(when.op as (typeof PROFILE_SIGNAL_OPS)[number])
      ) {
        errors.push(`rules[${index}].when.op is invalid`);
      }
    }

    const set = rawRule.set;
    if (!isObject(set) || typeof set.value !== "string") {
      errors.push(`rules[${index}].set.value must be a string`);
    } else if (
      field === "relationship_type" &&
      !RELATIONSHIP_SET_VALUES.has(set.value)
    ) {
      errors.push(
        `rules[${index}].set.value must be a valid relationship_type: ${PROFILE_RELATIONSHIP_VALUES.join(", ")}`,
      );
    }

    const confidence = rawRule.confidence;
    if (typeof confidence !== "number" || confidence < 0 || confidence > 100) {
      errors.push(`rules[${index}].confidence must be 0-100`);
    }

    const because = rawRule.because;
    if (typeof because !== "string" || !because.trim()) {
      errors.push(`rules[${index}].because is required`);
    }

    if (
      typeof id === "string" &&
      typeof field === "string" &&
      ALLOWED_FIELDS.includes(field as ProfileFieldKey) &&
      isObject(when) &&
      isObject(set) &&
      typeof set.value === "string" &&
      typeof confidence === "number" &&
      typeof because === "string"
    ) {
      rules.push({
        id,
        field: field as ProfileFieldKey,
        when: {
          signal: when.signal as ProfileSignalKey,
          op: when.op as ProfileFillRule["when"]["op"],
          value: when.value as string | number | boolean | undefined,
        },
        set: { value: set.value },
        confidence,
        because,
      });
    }
  }

  const fieldsRaw = input.fields;
  const fields =
    Array.isArray(fieldsRaw) && fieldsRaw.every((f) => typeof f === "string")
      ? (fieldsRaw as ProfileFieldKey[])
      : ALLOWED_FIELDS;

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    document: {
      version: 1,
      fields,
      rules,
    },
  };
}

export function defaultPeopleProfileRules(): ProfileFillRulesDocument {
  return {
    version: 1,
    fields: ["relationship_type", "title", "org_link"],
    rules: [
      {
        id: "rel-payment-client",
        field: "relationship_type",
        when: { signal: "has_payment_received", op: "eq", value: true },
        set: { value: "client" },
        confidence: 95,
        because: "A finance source shows they paid you",
      },
      {
        id: "rel-invoice-client",
        field: "relationship_type",
        when: { signal: "has_invoice_sent", op: "eq", value: true },
        set: { value: "client" },
        confidence: 90,
        because: "A billing source shows you invoiced them",
      },
      {
        id: "rel-workspace-team",
        field: "relationship_type",
        when: { signal: "email_domain_matches_workspace", op: "eq", value: true },
        set: { value: "team" },
        confidence: 92,
        because: "Their email uses your company domain",
      },
      {
        id: "rel-partner-domain",
        field: "relationship_type",
        when: { signal: "email_domain_in_partner_list", op: "eq", value: true },
        set: { value: "partner" },
        confidence: 90,
        because: "Their domain is on your partner list",
      },
      {
        id: "rel-vendor-domain",
        field: "relationship_type",
        when: { signal: "email_domain_in_vendor_list", op: "eq", value: true },
        set: { value: "vendor" },
        confidence: 88,
        because: "Their domain is on your vendor list",
      },
      {
        id: "rel-you-initiated-prospect",
        field: "relationship_type",
        when: { signal: "you_initiated", op: "eq", value: true },
        set: { value: "prospect" },
        confidence: 75,
        because: "You initiated contact",
      },
      {
        id: "title-signature",
        field: "title",
        when: { signal: "has_signature", op: "eq", value: true },
        set: { value: "{{extracted_title}}" },
        confidence: 80,
        because: "Job title found in email signature",
      },
      {
        id: "org-company-domain",
        field: "org_link",
        when: { signal: "email_domain_is_personal", op: "eq", value: false },
        set: { value: "{{org_domain}}" },
        confidence: 85,
        because: "Company email domain implies an organization",
      },
    ],
  };
}

export function resolveRuleSetValue(
  template: string,
  facts: { extracted_title?: string | null; org_domain?: string | null },
): string | null {
  if (template === "{{extracted_title}}") {
    return facts.extracted_title?.trim() || null;
  }
  if (template === "{{org_domain}}") {
    return facts.org_domain?.trim() || null;
  }
  return template;
}

export function relationshipFromLegacyHeuristics(
  signals?: {
    has_payment_received?: boolean;
    has_stripe_payment?: boolean;
    has_invoice_sent?: boolean;
    you_initiated?: boolean;
  },
): RelationshipType {
  if (signals?.has_payment_received || signals?.has_stripe_payment) return "client";
  if (signals?.has_invoice_sent) return "client";
  if (signals?.you_initiated) return "prospect";
  return "unknown";
}
