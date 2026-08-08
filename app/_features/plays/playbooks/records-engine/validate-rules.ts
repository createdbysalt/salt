import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import {
  PROFILE_ORG_RELATIONSHIP_VALUES,
  PROFILE_RELATIONSHIP_VALUES,
  PROFILE_SIGNAL_KEYS,
  PROFILE_SIGNAL_OPS,
  PROFILE_WORK_STATUS_VALUES,
  PROFILE_BILLING_STATUS_VALUES,
  PROFILE_MEETING_STATUS_VALUES,
  PROFILE_MEETING_TYPE_VALUES,
  PROFILE_FILE_CATEGORY_VALUES,
  PROFILE_FILE_LIFECYCLE_VALUES,
  NOTE_KIND_VALUES,
  OPERATOR_FACT_CATEGORY_VALUES,
  OPERATOR_FACT_KIND_VALUES,
  type ProfileFillRule,
  type ProfileFillRulesDocument,
  type ProfileFieldKey,
  type ProfileSignalKey,
} from "./types";

const ALLOWED_FIELDS: ProfileFieldKey[] = [
  "relationship_type",
  "title",
  "org_link",
  "website",
  "industry",
  "industry_parent",
  "industry_child",
  "relationship_status",
  "key_contact",
  "status",
  "description",
  "deadline",
  "start_date",
  "billing_email",
  "timezone",
  "currency",
  "payment_terms",
  "billing_cycle",
  "address_line1",
  "city",
  "postal_code",
  "country",
  "tax_id",
  "service_id",
  "renewal_date",
  "billing_contact_id",
  "organizationId",
  "personId",
  "projectId",
  "workId",
  "meeting_type",
  "location_type",
  "meeting_url",
  "category",
  "document_type",
  "lifecycle_status",
  "due_date",
  "expiry_date",
  "signed_date",
  "note_kind",
  "fact_category",
  "fact_kind",
];

const ALLOWED_SIGNALS: readonly ProfileSignalKey[] = PROFILE_SIGNAL_KEYS;

const RELATIONSHIP_SET_VALUES = new Set<string>(PROFILE_RELATIONSHIP_VALUES);
const ORG_RELATIONSHIP_SET_VALUES = new Set<string>(PROFILE_ORG_RELATIONSHIP_VALUES);
const WORK_STATUS_SET_VALUES = new Set<string>(PROFILE_WORK_STATUS_VALUES);
const BILLING_STATUS_SET_VALUES = new Set<string>(PROFILE_BILLING_STATUS_VALUES);
const MEETING_STATUS_SET_VALUES = new Set<string>(PROFILE_MEETING_STATUS_VALUES);
const MEETING_TYPE_SET_VALUES = new Set<string>(PROFILE_MEETING_TYPE_VALUES);
const FILE_CATEGORY_SET_VALUES = new Set<string>(PROFILE_FILE_CATEGORY_VALUES);
const FILE_LIFECYCLE_SET_VALUES = new Set<string>(PROFILE_FILE_LIFECYCLE_VALUES);
const NOTE_KIND_SET_VALUES = new Set<string>(NOTE_KIND_VALUES);
const OPERATOR_FACT_CATEGORY_SET_VALUES = new Set<string>(OPERATOR_FACT_CATEGORY_VALUES);
const OPERATOR_FACT_KIND_SET_VALUES = new Set<string>(OPERATOR_FACT_KIND_VALUES);

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
    } else if (
      field === "relationship_status" &&
      !ORG_RELATIONSHIP_SET_VALUES.has(set.value)
    ) {
      errors.push(
        `rules[${index}].set.value must be a valid relationship_status: ${PROFILE_ORG_RELATIONSHIP_VALUES.join(", ")}`,
      );
    } else if (
      field === "status" &&
      !WORK_STATUS_SET_VALUES.has(set.value) &&
      !BILLING_STATUS_SET_VALUES.has(set.value) &&
      !MEETING_STATUS_SET_VALUES.has(set.value)
    ) {
      errors.push(
        `rules[${index}].set.value must be a valid status: ${[
          ...PROFILE_WORK_STATUS_VALUES,
          ...PROFILE_BILLING_STATUS_VALUES,
          ...PROFILE_MEETING_STATUS_VALUES,
        ].join(", ")}`,
      );
    } else if (
      field === "meeting_type" &&
      !MEETING_TYPE_SET_VALUES.has(set.value) &&
      !set.value.startsWith("{{")
    ) {
      errors.push(
        `rules[${index}].set.value must be a valid meeting_type: ${PROFILE_MEETING_TYPE_VALUES.join(", ")}`,
      );
    } else if (
      field === "category" &&
      !FILE_CATEGORY_SET_VALUES.has(set.value) &&
      !set.value.startsWith("{{")
    ) {
      errors.push(
        `rules[${index}].set.value must be a valid file category: ${PROFILE_FILE_CATEGORY_VALUES.join(", ")}`,
      );
    } else if (
      field === "lifecycle_status" &&
      !FILE_LIFECYCLE_SET_VALUES.has(set.value)
    ) {
      errors.push(
        `rules[${index}].set.value must be a valid file lifecycle_status: ${PROFILE_FILE_LIFECYCLE_VALUES.join(", ")}`,
      );
    } else if (
      field === "note_kind" &&
      !NOTE_KIND_SET_VALUES.has(set.value)
    ) {
      errors.push(
        `rules[${index}].set.value must be a valid note_kind: ${NOTE_KIND_VALUES.join(", ")}`,
      );
    } else if (
      field === "fact_category" &&
      !OPERATOR_FACT_CATEGORY_SET_VALUES.has(set.value)
    ) {
      errors.push(
        `rules[${index}].set.value must be a valid fact_category: ${OPERATOR_FACT_CATEGORY_VALUES.join(", ")}`,
      );
    } else if (
      field === "fact_kind" &&
      !OPERATOR_FACT_KIND_SET_VALUES.has(set.value)
    ) {
      errors.push(
        `rules[${index}].set.value must be a valid fact_kind: ${OPERATOR_FACT_KIND_VALUES.join(", ")}`,
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

export function defaultOrgProfileRules(): ProfileFillRulesDocument {
  return {
    version: 1,
    fields: ["website", "industry", "relationship_status", "key_contact"],
    rules: [
      {
        id: "org-website-domain",
        field: "website",
        when: { signal: "org_domain_known", op: "eq", value: true },
        set: { value: "https://{{org_domain}}" },
        confidence: 85,
        because: "The organization has a trusted company domain",
      },
      {
        id: "org-payment-client",
        field: "relationship_status",
        when: { signal: "org_has_payment_received", op: "eq", value: true },
        set: { value: "client" },
        confidence: 95,
        because: "Finance evidence shows this organization paid you",
      },
      {
        id: "org-invoice-client",
        field: "relationship_status",
        when: { signal: "org_has_invoice_sent", op: "eq", value: true },
        set: { value: "client" },
        confidence: 90,
        because: "Billing evidence shows you invoiced this organization",
      },
      {
        id: "org-partner-domain",
        field: "relationship_status",
        when: { signal: "org_domain_in_partner_list", op: "eq", value: true },
        set: { value: "partner" },
        confidence: 90,
        because: "The organization domain is on your partner list",
      },
      {
        id: "org-vendor-domain",
        field: "relationship_status",
        when: { signal: "org_domain_in_vendor_list", op: "eq", value: true },
        set: { value: "vendor" },
        confidence: 88,
        because: "The organization domain is on your vendor list",
      },
      {
        id: "org-industry-inferred",
        field: "industry",
        when: { signal: "inferred_industry", op: "exists" },
        set: { value: "{{inferred_industry}}" },
        confidence: 80,
        because: "Direct organization context includes an industry label",
      },
      {
        id: "org-key-contact-inferred",
        field: "key_contact",
        when: { signal: "org_has_primary_contact", op: "eq", value: true },
        set: { value: "{{inferred_key_contact}}" },
        confidence: 82,
        because: "The linked person is the clearest primary contact for this organization",
      },
    ],
  };
}

export function defaultWorkProfileRules(): ProfileFillRulesDocument {
  return {
    version: 1,
    fields: ["status", "description", "deadline", "start_date"],
    rules: [
      {
        id: "work-created-active",
        field: "status",
        when: { signal: "work_created", op: "eq", value: true },
        set: { value: "active" },
        confidence: 90,
        because: "New work created from an explicit memory action starts active",
      },
      {
        id: "work-signed-contract",
        field: "status",
        when: { signal: "work_has_signed_contract", op: "eq", value: true },
        set: { value: "signed" },
        confidence: 92,
        because: "Contract evidence shows the work is signed",
      },
      {
        id: "work-kickoff-active",
        field: "status",
        when: { signal: "work_has_kickoff", op: "eq", value: true },
        set: { value: "active" },
        confidence: 88,
        because: "Kickoff evidence shows the work is underway",
      },
      {
        id: "work-blocked-on-hold",
        field: "status",
        when: { signal: "work_is_blocked", op: "eq", value: true },
        set: { value: "on_hold" },
        confidence: 80,
        because: "Direct work evidence says progress is blocked",
      },
      {
        id: "work-completed-deliverable",
        field: "status",
        when: { signal: "work_has_completed_deliverable", op: "eq", value: true },
        set: { value: "completed" },
        confidence: 85,
        because: "A completed deliverable is linked to this work",
      },
      {
        id: "work-description-inferred",
        field: "description",
        when: { signal: "inferred_description", op: "exists" },
        set: { value: "{{inferred_description}}" },
        confidence: 80,
        because: "Direct work context includes a concise description",
      },
      {
        id: "work-deadline-inferred",
        field: "deadline",
        when: { signal: "inferred_deadline", op: "exists" },
        set: { value: "{{inferred_deadline}}" },
        confidence: 85,
        because: "Direct work context includes a deadline",
      },
      {
        id: "work-start-date-inferred",
        field: "start_date",
        when: { signal: "inferred_start_date", op: "exists" },
        set: { value: "{{inferred_start_date}}" },
        confidence: 85,
        because: "Direct work context includes a start date",
      },
    ],
  };
}

export function resolveRuleSetValue(
  template: string,
  facts: Record<string, string | number | boolean | null | undefined>,
): string | null {
  const resolved = template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const value = facts[key];
    return value === null || value === undefined ? "" : String(value);
  });
  return resolved.trim() || null;
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
