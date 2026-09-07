/**
 * memoryUpdateField - Protected Memory Update Tool
 *
 * The key insight: Protection lives in this tool, not in callers.
 * Whether a playbook, Ask Salt, or manual UI calls this tool,
 * it enforces the same confidence threshold.
 *
 * Flow:
 * 1. Caller provides field, value, confidence, and reason
 * 2. Tool gets workspace threshold
 * 3. If confidence >= threshold → apply directly to Memory
 * 4. If confidence < threshold → accumulate evidence, wait for more
 *
 * @example
 * ```ts
 * const result = await memoryUpdateField({
 *   workspaceId: "...",
 *   entityType: "person",
 *   entityId: "...",
 *   field: "relationship_type",
 *   value: "client",
 *   confidence: 95,
 *   because: "Payment received",
 *   source: "playbook",
 * });
 *
 * // result.action === "applied" if 95 >= threshold (85)
 * // result.action === "accumulated" if 95 < threshold
 * ```
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  accumulateEvidence,
  getAggregatedConfidence,
  resolveEvidence,
  toLearningDbEntityType,
} from "@/app/_lib/learning";
import {
  generateEvidenceSummary,
  recordSaltLearning,
} from "@/app/_lib/learning/salt-learnings";
import { isNeverTouchField } from "@/app/_lib/learning/field-tiers";
import {
  findBlockingCorrection,
  getCorrectionBlocklist,
} from "@/app/_lib/learning/correction-blocklist";
import { getWorkspaceThreshold } from "./get-threshold";
import { attachPersonEmail } from "@/app/_features/memory/records/person-emails";
import type { Json } from "@/app/_lib/supabase/database.types";
import { RECORD_CONDITION_ROUTE_KEY_TO_ENTITY } from "@/app/_features/plays/playbooks/record-conditions";
import {
  getMemoryEntityTable,
  toMemoryToolRouteKey,
  type TableUpdate,
  type UpdateFieldInput,
  type UpdateFieldResult,
} from "./types";

/**
 * Update a Memory field with confidence-gated protection.
 *
 * This is the canonical way to update Memory records programmatically.
 * Both playbooks and Ask Salt should use this tool.
 */
export async function memoryUpdateField(
  input: UpdateFieldInput
): Promise<UpdateFieldResult> {
  // Never-touch fields (money) are refused at any confidence. This is a hard
  // rule enforced by the tool itself, not a queue — no evidence is parked.
  if (isNeverTouchField(input.entityType, input.field)) {
    return {
      action: "rejected",
      threshold: Number.POSITIVE_INFINITY,
      confidence: input.confidence,
      message: `Refused: ${input.field} is a never-touch field and is never auto-written`,
    };
  }

  // Correction read-forward: a value the user dismissed ("Not this") is
  // never re-proposed or re-applied by automated callers. Manual writes
  // bypass — the user re-accepting a dismissed value always wins.
  if (input.source !== "manual") {
    const blocklist = await getCorrectionBlocklist(
      input.workspaceId,
      input.entityType,
      input.entityId,
      input.field
    );
    const blocking = findBlockingCorrection(blocklist, input.field, input.value);
    if (blocking) {
      return {
        action: "rejected",
        threshold: Number.POSITIVE_INFINITY,
        confidence: input.confidence,
        message: `Refused: value was previously corrected by the user (correction ${blocking.id})`,
      };
    }
  }

  const { threshold: workspaceThreshold } = await getWorkspaceThreshold(
    input.workspaceId,
    input.entityType,
    input.field
  );

  // Callers (e.g. Memory Care tiered bars) may raise the bar, never lower it.
  const threshold = input.minThreshold
    ? Math.max(workspaceThreshold, input.minThreshold)
    : workspaceThreshold;

  // No-op guard: the field already holds this exact value — no matter who
  // set it (this tool, a manual edit, a seed). Accumulating evidence would
  // park a "proposal" in Watching for something already true and re-notify
  // on every care run (record_status → active on active records, 2026-09).
  // Return before accumulating; nothing changes, so nothing is audited.
  const currentValue = await getCurrentFieldValue(createAdminClient(), input);
  if (currentValue != null && String(currentValue) === String(input.value)) {
    return {
      action: "applied",
      threshold,
      confidence: input.confidence,
      aggregatedConfidence: input.confidence,
      appliedAt: new Date().toISOString(),
      noop: true,
      message: `Already set: ${input.field} = "${input.value}" — no change needed`,
    };
  }

  // First, accumulate the evidence regardless of confidence
  // This creates the audit trail
  const evidenceResult = await accumulateEvidence({
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
    fieldPath: input.field,
    proposedValue: input.value,
    confidence: input.confidence,
    evidenceType: "behavioral_signal",
    evidenceDetails: {
      because: input.because,
      source: input.source,
      ...input.sourceDetails,
    },
    sourceType: input.source,
    sourceCaptureId: input.sourceDetails?.captureId,
    sourceExternalId: input.sourceDetails?.externalId,
    playbookSlug: input.sourceDetails?.playbookSlug,
  });

  // Get aggregated confidence (may be higher than input due to corroboration)
  const aggregated = await getAggregatedConfidence(
    input.workspaceId,
    input.entityType,
    input.entityId,
    input.field
  );

  const aggregatedConfidence =
    aggregated?.aggregatedConfidence ?? input.confidence;

  // Check if we meet threshold
  if (aggregatedConfidence >= threshold) {
    // Apply the change
    const { appliedAt, previous, noop } = await applyFieldUpdate(input);

    // Record-condition triggers: a successful write may satisfy a playbook's
    // "when <entity> <field> <op> <value>" condition. Best-effort — a
    // dispatch failure must never break the write that fired it. Dynamic
    // import avoids a module cycle (trigger-dispatch → executor → memory
    // tools → trigger-dispatch).
    if (!noop) {
      try {
        const rcEntity =
          RECORD_CONDITION_ROUTE_KEY_TO_ENTITY[
            toMemoryToolRouteKey(input.entityType)
          ];
        if (rcEntity) {
          const { dispatchRecordConditionTrigger } = await import(
            "@/app/_features/plays/playbooks/trigger-dispatch"
          );
          await dispatchRecordConditionTrigger({
            workspaceId: input.workspaceId,
            entity: rcEntity,
            field: input.field,
            newValue: input.value,
            entityId: input.entityId,
          });
        }
      } catch (error) {
        console.error("[memory-tools] record-condition dispatch failed:", error);
      }
    }

    // Handled audit trail: an applied Salt-driven write surfaces in Memory →
    // Activity → Handled with a rollback affordance. User-driven sources
    // (manual edits, Ask Salt requests) don't log — the user just did it.
    // No-op applies (value already set) don't log either: Handled is the
    // audit trail of changes, and nothing changed. Logging must never
    // break the write.
    let learningId: string | undefined;
    if (!noop && shouldLogHandled(input)) {
      try {
        const entityLabel = await fetchEntityLabel(
          createAdminClient(),
          input,
        );
        const logged = await recordSaltLearning({
          workspaceId: input.workspaceId,
          entityType: input.entityType,
          entityId: input.entityId,
          entityLabel,
          fieldPath: input.field,
          oldValue: previous.value,
          newValue: input.value,
          confidence: aggregatedConfidence,
          evidenceSummary: generateEvidenceSummary(
            aggregated?.evidenceCount ?? 1,
            aggregated?.sourceTypeCount ?? 1,
          ),
          evidenceIds: aggregated?.evidenceIds,
          playbookSlug: input.sourceDetails?.playbookSlug,
        });
        learningId = logged.id;
      } catch (error) {
        console.error("[memory-tools] Handled learning log failed:", error);
      }
    }

    // Resolve all pending evidence for this field
    if (aggregated?.evidenceIds.length) {
      await resolveEvidence(
        input.workspaceId,
        aggregated.evidenceIds,
        "applied",
        {
          appliedAt,
          aggregatedConfidence,
          threshold,
          ...(learningId ? { learningId } : {}),
        }
      );
    }

    return {
      action: "applied",
      threshold,
      confidence: input.confidence,
      aggregatedConfidence,
      appliedAt,
      ...(noop ? { noop: true } : {}),
      message: noop
        ? `Already set: ${input.field} = "${input.value}" — no change needed`
        : `Applied: ${input.field} = "${input.value}" (${aggregatedConfidence}% >= ${threshold}% threshold)`,
    };
  }

  // Below threshold - evidence accumulated, waiting for more
  return {
    action: "accumulated",
    threshold,
    confidence: input.confidence,
    aggregatedConfidence,
    evidenceId: evidenceResult.evidenceId,
    message: `Accumulated evidence: ${input.field} = "${input.value}" (${aggregatedConfidence}% < ${threshold}% threshold, waiting for more signals)`,
  };
}

/**
 * Salt-driven sources that earn a Handled (`salt_learnings`) row when the
 * tool applies a write. Manual edits and Ask Salt requests are user-driven —
 * the user just watched them happen, so they don't belong in the audit lane.
 */
const HANDLED_LOGGING_SOURCES = new Set(["care", "enrichment", "cron", "playbook"]);

function shouldLogHandled(input: UpdateFieldInput): boolean {
  return !input.skipLearningLog && HANDLED_LOGGING_SOURCES.has(input.source);
}

interface PreviousState {
  value: unknown;
  provenanceId: string | null;
}

/**
 * Best-effort display label for the entity being written — the Handled row
 * headline reads "Set <label>'s <field> to …". Falls back to the entity
 * type; a missing label must never block the write.
 */
async function fetchEntityLabel(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<string> {
  try {
    switch (toMemoryToolRouteKey(input.entityType)) {
      case "me":
        return "you";
      case "billing": {
        const { data } = await admin
          .from("billing_records")
          .select("number, vendor_label")
          .eq("id", input.entityId)
          .maybeSingle();
        const row = data as { number: string | null; vendor_label: string | null } | null;
        if (row?.number) return `Invoice ${row.number}`;
        return row?.vendor_label ?? "billing record";
      }
      default: {
        const table = getMemoryEntityTable(input.entityType);
        if (!table) return input.entityType;
        const column =
          table === "meetings"
            ? "title"
            : table === "resources"
              ? "file_name"
              : "name";
        const { data } = await admin
          .from(table)
          .select(column)
          .eq("id", input.entityId)
          .maybeSingle();
        const label = (data as Record<string, unknown> | null)?.[column];
        return typeof label === "string" && label ? label : input.entityType;
      }
    }
  } catch {
    return input.entityType;
  }
}

/**
 * Apply the field update to the actual Memory table.
 * Routes to the appropriate table based on entity type.
 * Returns the apply timestamp plus the previous state (for the Handled
 * audit trail's oldValue).
 */
async function applyFieldUpdate(
  input: UpdateFieldInput
): Promise<{ appliedAt: string; previous: PreviousState; noop: boolean }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 1. Get the previous value and provenance for rollback support
  const previous = await getPreviousState(admin, input);

  // No-op guard: the tool already applied this exact value. Re-applying
  // would rewrite the row, duplicate the provenance chain, and spam
  // Handled (salt_learnings) with a "change" that changed nothing. Exact
  // string match only — anything ambiguous applies normally.
  if (
    previous.value != null &&
    String(previous.value) === String(input.value)
  ) {
    return { appliedAt: now, previous, noop: true };
  }

  // 2. Map entity types to tables and update
  switch (toMemoryToolRouteKey(input.entityType)) {
    case "person":
      await updatePersonField(admin, input);
      break;
    case "organization":
      await updateOrgField(admin, input);
      break;
    case "work":
      await updateWorkField(admin, input);
      break;
    case "billing":
      await updateBillingField(admin, input);
      break;
    case "meeting":
      await updateMeetingField(admin, input);
      break;
    case "resource":
      await updateFileField(admin, input);
      break;
    case "me":
      await updateOperatorField(admin, input);
      break;
    default:
      throw new Error(`Unknown entity type: ${input.entityType}`);
  }

  // 3. Record provenance with previous state
  await recordProvenance(admin, input, now, previous);

  return { appliedAt: now, previous, noop: false };
}

/**
 * Current value straight from the backing row — the no-op guard's source of
 * truth. Reads the table/column the writer would write, so manual edits and
 * seeds count (provenance only knows tool-applied writes). Returns null for
 * unmappable fields (org_link junction, Me profile/workspace splits) — those
 * skip the guard.
 */
async function getCurrentFieldValue(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<unknown> {
  const table = getMemoryEntityTable(input.entityType);
  const dbField =
    MEMORY_TOOL_FIELD_MAPS[toMemoryToolRouteKey(input.entityType)]?.[
      input.field
    ];
  if (!table || !dbField) return null;
  const { data } = await admin
    .from(table)
    .select(dbField)
    .eq("id", input.entityId)
    .maybeSingle();
  return (data as Record<string, unknown> | null)?.[dbField] ?? null;
}

/**
 * Get the previous value and most recent provenance for a field.
 * Used to enable rollback.
 */
async function getPreviousState(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<PreviousState> {
  // Get the most recent provenance for this field
  const { data: prevProvenance } = await admin
    .from("profile_field_provenance")
    .select("id, value")
    .eq("workspace_id", input.workspaceId)
    .eq("entity_type", toLearningDbEntityType(input.entityType))
    .eq("entity_id", input.entityId)
    .eq("field", input.field)
    .eq("status", "applied")
    .order("set_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    value: prevProvenance?.value ?? null,
    provenanceId: prevProvenance?.id ?? null,
  };
}

/**
 * Writable field maps — the columns each entity writer can resolve.
 * Hoisted + exported so the registry parity test can prove every care_auto
 * registry field with a dbColumn resolves here (a missing key used to throw
 * "Unknown <entity> field" AFTER evidence was parked, stranding the proposal
 * in Watching forever — see record_status, 2026-09).
 */
export const PERSON_FIELD_MAP: Record<string, keyof TableUpdate<"people">> = {
  relationship_type: "relationship_type",
  record_status: "record_status",
  name: "name",
  title: "title",
  email: "email",
  phone: "phone",
  billing_email: "billing_email",
  timezone: "timezone",
  // Address aliases → actual DB columns (address_line_1/_2)
  address_line1: "address_line_1",
  address_line_1: "address_line_1",
  addressLine1: "address_line_1",
  address_line2: "address_line_2",
  address_line_2: "address_line_2",
  addressLine2: "address_line_2",
  city: "city",
  state: "state",
  postal_code: "postal_code",
  country: "country",
  first_contact_at: "first_contact_at",
  last_contact_at: "last_contact_at",
};

async function updatePersonField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap = PERSON_FIELD_MAP;

  const dbField = fieldMap[input.field];
  if (!dbField) {
    // org_link: people has no organization_id column — the relationship
    // lives in the organization_people junction.
    if (input.field === "org_link" && typeof input.value === "string") {
      await linkPersonToOrganization(admin, {
        workspaceId: input.workspaceId,
        personId: input.entityId,
        organizationId: input.value,
      });
      return;
    }
    // email_attach: a SECONDARY address for a person who already has a
    // primary. Writes a non-primary person_emails row; people.email (the
    // denormalized primary) is untouched.
    if (input.field === "email_attach" && typeof input.value === "string") {
      const result = await attachPersonEmail(admin, {
        workspaceId: input.workspaceId,
        personId: input.entityId,
        email: input.value,
        source: "capture",
      });
      if (!result.attached && result.reason !== "already attached") {
        throw new Error(`Failed to attach email: ${result.reason}`);
      }
      return;
    }
    throw new Error(`Unknown person field: ${input.field}`);
  }

  await admin
    .from("people")
    .update({ [dbField]: input.value } as TableUpdate<"people">)
    .eq("id", input.entityId)
    .eq("workspace_id", input.workspaceId);

  // Keep the identity set in sync when the primary address is (re)written:
  // the new address becomes the primary person_emails row.
  if (dbField === "email" && typeof input.value === "string" && input.value.trim()) {
    await attachPersonEmail(admin, {
      workspaceId: input.workspaceId,
      personId: input.entityId,
      email: input.value,
      source: "capture",
      primary: true,
    });
  }
}

/**
 * Link a person to an organization via the organization_people junction.
 * Verifies both records belong to the workspace before writing.
 */
async function linkPersonToOrganization(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    workspaceId: string;
    personId: string;
    organizationId: string;
    role?: string;
    isPrimary?: boolean;
  }
): Promise<void> {
  const [{ data: org }, { data: person }] = await Promise.all([
    admin
      .from("organizations")
      .select("id")
      .eq("id", params.organizationId)
      .eq("workspace_id", params.workspaceId)
      .maybeSingle(),
    admin
      .from("people")
      .select("id")
      .eq("id", params.personId)
      .eq("workspace_id", params.workspaceId)
      .maybeSingle(),
  ]);

  if (!org || !person) {
    throw new Error(
      `Cannot link person ${params.personId} to organization ${params.organizationId}: not found in workspace`
    );
  }

  const { error } = await admin.from("organization_people").upsert(
    {
      organization_id: params.organizationId,
      person_id: params.personId,
      ...(params.role !== undefined ? { role: params.role } : {}),
      ...(params.isPrimary !== undefined ? { is_primary: params.isPrimary } : {}),
    },
    { onConflict: "organization_id,person_id" }
  );

  if (error) {
    throw new Error(`Failed to link person to organization: ${error.message}`);
  }
}

export const ORG_FIELD_MAP: Record<string, keyof TableUpdate<"organizations">> = {
  relationship_status: "relationship_status",
  record_status: "record_status",
  industry: "industry",
  industry_parent: "industry_parent",
  industry_child: "industry_child",
  website: "website",
  domain: "domain",
  billing_email: "billing_email",
  // Address aliases → actual DB columns (address_line_1/_2)
  address_line1: "address_line_1",
  address_line_1: "address_line_1",
  addressLine1: "address_line_1",
  address_line2: "address_line_2",
  address_line_2: "address_line_2",
  addressLine2: "address_line_2",
  city: "city",
  state: "state",
  postal_code: "postal_code",
  country: "country",
  tax_id: "tax_id",
  // organizations only has last_contact_at; accept the alias spelling too
  last_contacted_at: "last_contact_at",
  last_contact_at: "last_contact_at",
};

async function updateOrgField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap = ORG_FIELD_MAP;

  const dbField = fieldMap[input.field];
  if (!dbField) {
    // key_contact: organizations has no primary_contact_id column — mark the
    // person as primary in the organization_people junction instead.
    if (input.field === "key_contact" && typeof input.value === "string") {
      await linkPersonToOrganization(admin, {
        workspaceId: input.workspaceId,
        personId: input.value,
        organizationId: input.entityId,
        role: "Primary Contact",
        isPrimary: true,
      });
      // Demote any other primary contacts for this organization
      await admin
        .from("organization_people")
        .update({ is_primary: false })
        .eq("organization_id", input.entityId)
        .neq("person_id", input.value)
        .eq("is_primary", true);
      return;
    }
    throw new Error(`Unknown organization field: ${input.field}`);
  }

  await admin
    .from("organizations")
    .update({ [dbField]: input.value } as TableUpdate<"organizations">)
    .eq("id", input.entityId)
    .eq("workspace_id", input.workspaceId);
}

export const WORK_FIELD_MAP: Record<string, keyof TableUpdate<"work">> = {
  // Renames are a first-class correction ("the name of the work is X") —
  // the field registry already treats name as a writable work field.
  name: "name",
  status: "status",
  description: "description",
  deadline: "deadline",
  start_date: "start_date",
};

async function updateWorkField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap = WORK_FIELD_MAP;

  const dbField = fieldMap[input.field];
  if (!dbField) {
    throw new Error(`Unknown work field: ${input.field}`);
  }

  await admin
    .from("work")
    .update({ [dbField]: input.value } as TableUpdate<"work">)
    .eq("id", input.entityId)
    .eq("workspace_id", input.workspaceId);
}

export const BILLING_FIELD_MAP: Record<string, keyof TableUpdate<"billing_records">> = {
  status: "status",
  organizationId: "organization_id",
  personId: "person_id",
  // billing_records has no project_id column — the work link is work_id
  projectId: "work_id",
  workId: "work_id",
  // The billing-record producer writes by dbColumn (field-registry keys map
  // 1:1 onto these), so dbColumn spellings must resolve here too.
  number: "number",
  amount_paid_cents: "amount_paid_cents",
  paid_at: "paid_at",
  due_at: "due_at",
  app_url: "app_url",
  currency: "currency",
  vendor_label: "vendor_label",
  category: "category",
};

async function updateBillingField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap = BILLING_FIELD_MAP;

  const dbField = fieldMap[input.field];
  if (!dbField) {
    throw new Error(`Unknown billing field: ${input.field}`);
  }

  await admin
    .from("billing_records")
    .update({ [dbField]: input.value } as TableUpdate<"billing_records">)
    .eq("id", input.entityId)
    .eq("workspace_id", input.workspaceId);
}

export const MEETING_FIELD_MAP: Record<string, keyof TableUpdate<"meetings">> = {
  status: "status",
  meeting_type: "meeting_type",
  location_type: "location_type",
  meeting_url: "meeting_url",
  start_time: "start_time",
  end_time: "end_time",
  attendees: "attendees",
  organizationId: "organization_id",
  personId: "person_id",
  workId: "work_id",
};

async function updateMeetingField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap = MEETING_FIELD_MAP;

  const dbField = fieldMap[input.field];
  if (!dbField) {
    throw new Error(`Unknown meeting field: ${input.field}`);
  }

  await admin
    .from("meetings")
    .update({ [dbField]: input.value } as TableUpdate<"meetings">)
    .eq("id", input.entityId)
    .eq("workspace_id", input.workspaceId);
}

export const FILE_FIELD_MAP: Record<string, keyof TableUpdate<"resources">> = {
  category: "category",
  document_type: "document_type",
  lifecycle_status: "lifecycle_status",
  due_date: "due_date",
  expiry_date: "expiry_date",
  signed_date: "signed_date",
  total_amount_cents: "total_amount_cents",
  organizationId: "organization_id",
  personId: "person_id",
};

async function updateFileField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  // Note: files has no work_id column — a former workId → work_id mapping
  // targeted a nonexistent column and could never have applied.
  const fieldMap = FILE_FIELD_MAP;

  const dbField = fieldMap[input.field];
  if (!dbField) {
    throw new Error(`Unknown file field: ${input.field}`);
  }

  await admin
    .from("resources")
    .update({ [dbField]: input.value } as TableUpdate<"resources">)
    .eq("id", input.entityId)
    .eq("workspace_id", input.workspaceId);
}

/**
 * Me fields can be on profiles or workspaces. Keys accept both the
 * registry's camelCase field keys and snake_case column names.
 * Legal/tax/payment fields are deliberately absent — the registry marks
 * them user_only and field-tiers lists them never_touch.
 */
export const ME_PROFILE_FIELD_MAP: Record<string, keyof TableUpdate<"profiles">> = {
  display_name: "display_name",
  fullName: "display_name",
  role_title: "role_title",
  roleTitle: "role_title",
  tagline: "tagline",
  timezone: "timezone",
  location: "location",
  phone: "phone",
  gender: "gender",
  preferred_name: "preferred_name",
  preferredName: "preferred_name",
  address_line_1: "address_line_1",
  addressLine1: "address_line_1",
  address_line_2: "address_line_2",
  addressLine2: "address_line_2",
  city: "city",
  state: "state",
  postal_code: "postal_code",
  postalCode: "postal_code",
  country: "country",
  professional_credentials: "professional_credentials",
  professionalCredentials: "professional_credentials",
};

export const ME_WORKSPACE_FIELD_MAP: Record<string, keyof TableUpdate<"workspaces">> = {
  name: "name",
  tagline: "tagline",
  description: "description",
  website_url: "website_url",
  websiteUrl: "website_url",
  industry: "industry",
  legal_business_name: "legal_business_name",
  business_type: "business_type",
  business_email: "business_email",
  business_phone: "business_phone",
  businessPhone: "business_phone",
  // Disambiguated from the profile's own location field
  business_location: "location",
};

/**
 * All writable field keys per memory-tool route key, for the registry
 * parity test (`taxonomy/registry-parity.test.ts`). `me` is the union of
 * the profile and workspace maps.
 */
export const MEMORY_TOOL_FIELD_MAPS: Record<string, Record<string, string>> = {
  person: PERSON_FIELD_MAP,
  organization: ORG_FIELD_MAP,
  work: WORK_FIELD_MAP,
  billing: BILLING_FIELD_MAP,
  meeting: MEETING_FIELD_MAP,
  resource: FILE_FIELD_MAP,
  me: { ...ME_PROFILE_FIELD_MAP, ...ME_WORKSPACE_FIELD_MAP },
};

async function updateOperatorField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const profileFields = ME_PROFILE_FIELD_MAP;

  if (profileFields[input.field]) {
    await admin
      .from("profiles")
      .update({ [profileFields[input.field]]: input.value } as TableUpdate<"profiles">)
      .eq("id", input.entityId);
    return;
  }

  // Workspace fields
  const workspaceFields = ME_WORKSPACE_FIELD_MAP;

  if (workspaceFields[input.field]) {
    await admin
      .from("workspaces")
      .update({ [workspaceFields[input.field]]: input.value } as TableUpdate<"workspaces">)
      .eq("id", input.entityId);
    return;
  }

  throw new Error(`Unknown operator field: ${input.field}`);
}

async function recordProvenance(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput,
  appliedAt: string,
  previous: PreviousState
): Promise<void> {
  await admin.from("profile_field_provenance").insert({
    workspace_id: input.workspaceId,
    entity_type: toLearningDbEntityType(input.entityType),
    entity_id: input.entityId,
    field: input.field,
    value: String(input.value),
    source: input.source === "playbook" || input.source === "care" ? "rule" : input.source,
    blueprint_slug: input.sourceDetails?.playbookSlug ?? null,
    rule_id: input.sourceDetails?.ruleId ?? null,
    confidence: input.confidence,
    because: input.because,
    status: "applied",
    evidence: {
      source: input.source,
      ...input.sourceDetails,
      // Boundary cast: chain items carry `value: unknown`, which is Json in
      // practice (values originate from Json columns and tool inputs).
      evidenceChain: (input.evidenceChain ?? []) as unknown as Json,
    },
    previous_value: (previous.value ?? null) as Json,
    previous_provenance_id: previous.provenanceId,
    set_at: appliedAt,
  });
}
