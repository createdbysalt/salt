import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import {
  orgDefaultsFromRegistry,
  peopleDefaultsFromRegistry,
  workDefaultsFromRegistry,
} from "./registry-defaults";
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

/**
 * Default fill rules are READS of the field registry (the same source the
 * Memory → Customize card renders), translated for creation-time evaluation
 * by ./registry-defaults. Never hardcode rules here — edit the registry.
 */
export function defaultPeopleProfileRules(): ProfileFillRulesDocument {
  return peopleDefaultsFromRegistry();
}

export function defaultOrgProfileRules(): ProfileFillRulesDocument {
  return orgDefaultsFromRegistry();
}

export function defaultWorkProfileRules(): ProfileFillRulesDocument {
  return workDefaultsFromRegistry();
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
