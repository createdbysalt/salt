/**
 * Memory field tiers — the shared policy for how aggressively a proposed
 * Memory write may be applied. Pure functions only; no I/O.
 *
 * Used by:
 * - `app/_lib/memory-tools/update-field.ts` (hard never-touch refusal +
 *   caller-raised bars via `minThreshold`)
 * - `app/_features/memory/care/decision-pipeline.ts` (apply / watch / refuse)
 *
 * Tier model (replaces the retired execution-router's ask-first logic):
 *
 * | Tier        | Bar                        | Examples                              |
 * |-------------|----------------------------|---------------------------------------|
 * | standard    | workspace threshold        | notes, preferences, addresses         |
 * | sensitive   | workspace threshold        | industry, relationship type,          |
 * |             |                            | first-time classifications            |
 * | destructive | workspace threshold        | status → past_client / completed /    |
 * |             | (snapshot via provenance)  | cancelled / void                      |
 * | never_touch | refused at any confidence  | billing total, amount_paid, money     |
 * |             |                            | model fields                          |
 *
 * One bar, user-controlled: every gated field is held to the workspace's
 * auto-apply threshold — nothing silently demands more. Tiers still matter
 * for policy (never-touch refusals, destructive-transition provenance
 * snapshots), never for raising the bar.
 *
 * Low-risk observation fields (last_contacted_at, names, emails) bypass
 * gating entirely — they are always safe to apply.
 */

export type MemoryFieldTier =
  | "standard"
  | "sensitive"
  | "destructive"
  | "never_touch";

export type TieredEntityType =
  | "person"
  | "organization"
  | "work"
  | "billing"
  | "me";

/**
 * Never-touch: money fields, and the operator's legal/tax/payment setup.
 * Hard rule — never auto-written at any confidence. Not a queue, not an
 * approval: a refusal.
 *
 * Me keys are memory-tools field keys (see `updateOperatorField`) and mirror
 * the registry's user_only Me fields: the operator sets legal name, tax ID,
 * currency, and payment terms by hand, always.
 */
const NEVER_TOUCH_FIELDS: Record<string, string[]> = {
  billing: ["total", "amount_paid"],
  work: ["billing_model"],
  me: [
    "tax_id_type",
    "taxIdType",
    "tax_id_last4",
    "taxIdLast4",
    "default_currency",
    "defaultCurrency",
    "payment_terms",
    "paymentTerms",
    "legal_business_name",
    "legalBusinessName",
  ],
};

/**
 * Sensitive: identity and relationship classifications. Tier membership is
 * informational (audit, provenance) — the bar is the workspace threshold,
 * same as every gated field.
 */
const SENSITIVE_FIELDS: Record<string, string[]> = {
  person: ["industry", "preferred_channel", "relationship_type"],
  organization: ["industry", "industry_parent", "relationship_status"],
  work: ["work_type"],
  billing: [],
  me: [],
};

/**
 * First-time classifications: sensitive only while the field has no
 * meaningful value yet. Re-classifications of an already-set value fall back
 * to the standard bar (the user can correct from the activity feed).
 */
const FIRST_TIME_CLASSIFICATION_FIELDS: Record<string, string[]> = {
  person: ["record_status"],
  organization: ["record_status"],
  work: ["work_status", "status"],
  billing: ["status"],
  me: [],
};

/**
 * Destructive transitions: moving a record INTO one of these values closes
 * things out. The previous value is snapshotted in
 * `profile_field_provenance` on every applied write, so reversal is one
 * click. The bar is the workspace threshold, same as every gated field.
 */
const DESTRUCTIVE_VALUES: Record<string, string[]> = {
  record_status: ["past_client", "archived", "lost"],
  work_status: ["completed", "cancelled", "lost"],
  status: ["completed", "cancelled", "lost", "void"],
};

/**
 * Low-risk observation fields that bypass gating entirely.
 * (Union of the retired execution-router and confidence-gate bypass lists.)
 */
const ALWAYS_AUTO_FIELDS: Record<string, string[]> = {
  person: [
    "last_contacted_at",
    "last_contact_at",
    "first_contact_at",
    "first_name",
    "last_name",
    "email",
    "phone",
    "company",
    "role",
    "avatar_url",
  ],
  organization: [
    "last_contacted_at",
    "last_contact_at",
    "name",
    "domain",
    "website",
    "logo_url",
  ],
  work: ["last_activity_at", "title"],
  billing: ["last_activity_at"],
  // No Me field bypasses gating: even the suggestable ones (care_ask in the
  // registry) hold for operator confirmation.
  me: [],
};

function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "unknown"
  );
}

function includesField(
  map: Record<string, string[]>,
  entityType: string,
  field: string
): boolean {
  return map[entityType]?.includes(field) ?? false;
}

/** True when the field is never auto-written at any confidence. */
export function isNeverTouchField(entityType: string, field: string): boolean {
  return includesField(NEVER_TOUCH_FIELDS, entityType, field);
}

/** True when the field bypasses confidence gating entirely. */
export function isAlwaysAutoField(entityType: string, field: string): boolean {
  return includesField(ALWAYS_AUTO_FIELDS, entityType, field);
}

/**
 * Classify a proposed Memory write into its tier.
 *
 * @param currentValue - the field's current value (used for first-time
 *   classification detection). Pass null/undefined when unknown.
 * @param proposedValue - the value being proposed (used for destructive
 *   transition detection).
 */
export function classifyFieldTier(
  entityType: TieredEntityType | string,
  field: string,
  proposedValue?: unknown,
  currentValue?: unknown
): MemoryFieldTier {
  if (isNeverTouchField(entityType, field)) return "never_touch";

  if (
    typeof proposedValue === "string" &&
    (DESTRUCTIVE_VALUES[field] ?? []).includes(proposedValue)
  ) {
    return "destructive";
  }

  if (includesField(SENSITIVE_FIELDS, entityType, field)) return "sensitive";

  if (
    includesField(FIRST_TIME_CLASSIFICATION_FIELDS, entityType, field) &&
    isEmptyValue(currentValue)
  ) {
    return "sensitive";
  }

  return "standard";
}

/**
 * The confidence bar a proposal must clear, given the workspace's
 * auto-apply threshold. One user-controlled bar for every gated field —
 * tiers never raise it. Never-touch fields are refused outright (Infinity).
 */
export function tierBar(tier: MemoryFieldTier, workspaceThreshold: number): number {
  switch (tier) {
    case "never_touch":
      return Number.POSITIVE_INFINITY;
    default:
      return workspaceThreshold;
  }
}

export type TierDecision = "apply" | "watch" | "refuse";

/**
 * Pure routing decision for a proposal. Always-auto fields are handled by
 * callers before reaching this function.
 */
export function decideTierOutcome(
  tier: MemoryFieldTier,
  confidence: number,
  workspaceThreshold: number
): { decision: TierDecision; bar: number } {
  if (tier === "never_touch") {
    return { decision: "refuse", bar: Number.POSITIVE_INFINITY };
  }
  const bar = tierBar(tier, workspaceThreshold);
  return { decision: confidence >= bar ? "apply" : "watch", bar };
}
