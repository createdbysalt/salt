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
} from "@/app/_lib/learning";
import { isNeverTouchField } from "@/app/_lib/learning/field-tiers";
import {
  findBlockingCorrection,
  getCorrectionBlocklist,
} from "@/app/_lib/learning/correction-blocklist";
import { getWorkspaceThreshold } from "./get-threshold";
import type { Json } from "@/app/_lib/supabase/database.types";
import type { TableUpdate, UpdateFieldInput, UpdateFieldResult } from "./types";

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
    const appliedAt = await applyFieldUpdate(input);

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
        }
      );
    }

    return {
      action: "applied",
      threshold,
      confidence: input.confidence,
      aggregatedConfidence,
      appliedAt,
      message: `Applied: ${input.field} = "${input.value}" (${aggregatedConfidence}% >= ${threshold}% threshold)`,
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

interface PreviousState {
  value: unknown;
  provenanceId: string | null;
}

/**
 * Apply the field update to the actual Memory table.
 * Routes to the appropriate table based on entity type.
 */
async function applyFieldUpdate(input: UpdateFieldInput): Promise<string> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 1. Get the previous value and provenance for rollback support
  const previous = await getPreviousState(admin, input);

  // 2. Map entity types to tables and update
  switch (input.entityType) {
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
    case "file":
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

  return now;
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
    .eq("entity_type", input.entityType)
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

async function updatePersonField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap: Record<string, keyof TableUpdate<"people">> = {
    relationship_type: "relationship_type",
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
    throw new Error(`Unknown person field: ${input.field}`);
  }

  await admin
    .from("people")
    .update({ [dbField]: input.value } as TableUpdate<"people">)
    .eq("id", input.entityId)
    .eq("workspace_id", input.workspaceId);
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

async function updateOrgField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap: Record<string, keyof TableUpdate<"organizations">> = {
    relationship_status: "relationship_status",
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
  };

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

async function updateWorkField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap: Record<string, keyof TableUpdate<"work">> = {
    status: "status",
    description: "description",
    deadline: "deadline",
    start_date: "start_date",
  };

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

async function updateBillingField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap: Record<string, keyof TableUpdate<"billing_records">> = {
    status: "status",
    organizationId: "organization_id",
    personId: "person_id",
    // billing_records has no project_id column — the work link is work_id
    projectId: "work_id",
    workId: "work_id",
  };

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

async function updateMeetingField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  const fieldMap: Record<string, keyof TableUpdate<"meetings">> = {
    status: "status",
    meeting_type: "meeting_type",
    location_type: "location_type",
    meeting_url: "meeting_url",
    organizationId: "organization_id",
    personId: "person_id",
    workId: "work_id",
  };

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

async function updateFileField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  // Note: files has no work_id column — a former workId → work_id mapping
  // targeted a nonexistent column and could never have applied.
  const fieldMap: Record<string, keyof TableUpdate<"files">> = {
    category: "category",
    document_type: "document_type",
    lifecycle_status: "lifecycle_status",
    due_date: "due_date",
    expiry_date: "expiry_date",
    signed_date: "signed_date",
    organizationId: "organization_id",
    personId: "person_id",
  };

  const dbField = fieldMap[input.field];
  if (!dbField) {
    throw new Error(`Unknown file field: ${input.field}`);
  }

  await admin
    .from("files")
    .update({ [dbField]: input.value } as TableUpdate<"files">)
    .eq("id", input.entityId)
    .eq("workspace_id", input.workspaceId);
}

async function updateOperatorField(
  admin: ReturnType<typeof createAdminClient>,
  input: UpdateFieldInput
): Promise<void> {
  // Me fields can be on profiles or workspaces
  const profileFields: Record<string, keyof TableUpdate<"profiles">> = {
    display_name: "display_name",
    role_title: "role_title",
    tagline: "tagline",
    timezone: "timezone",
    location: "location",
    phone: "phone",
    gender: "gender",
    preferred_name: "preferred_name",
  };

  if (profileFields[input.field]) {
    await admin
      .from("profiles")
      .update({ [profileFields[input.field]]: input.value } as TableUpdate<"profiles">)
      .eq("id", input.entityId);
    return;
  }

  // Workspace fields
  const workspaceFields: Record<string, keyof TableUpdate<"workspaces">> = {
    name: "name",
    tagline: "tagline",
    description: "description",
    website_url: "website_url",
    industry: "industry",
    legal_business_name: "legal_business_name",
    business_type: "business_type",
    business_email: "business_email",
    business_phone: "business_phone",
  };

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
    entity_type: input.entityType,
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
