/**
 * memoryGetFacts - Entity Facts Retrieval Tool
 *
 * Returns the current state of an entity's fields along with
 * computed signals. This is what playbooks use to evaluate rules.
 *
 * @example
 * ```ts
 * const { facts, signals } = await memoryGetFacts({
 *   workspaceId: "...",
 *   entityType: "person",
 *   entityId: "...",
 * });
 *
 * // facts.relationship_type.value === "client"
 * // signals.has_payment_received === true
 * ```
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type {
  GetFactsInput,
  GetFactsResult,
  EntityFact,
  LearningEntityType,
} from "./types";

/**
 * Get current facts and signals for an entity.
 */
export async function memoryGetFacts(
  input: GetFactsInput
): Promise<GetFactsResult> {
  const admin = createAdminClient();

  // Fetch entity data based on type
  const entityData = await fetchEntityData(
    admin,
    input.workspaceId,
    input.entityType,
    input.entityId
  );

  // Fetch provenance for applied fields
  const { data: provenanceRows } = await admin
    .from("profile_field_provenance")
    .select("field, value, confidence, source, set_at")
    .eq("workspace_id", input.workspaceId)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .eq("status", "applied")
    .order("set_at", { ascending: false });

  // Build facts from provenance + entity data
  const facts: Record<string, EntityFact> = {};
  const seenFields = new Set<string>();

  // Provenance takes precedence (most recent first)
  for (const row of provenanceRows ?? []) {
    if (seenFields.has(row.field)) continue;
    if (input.fields && !input.fields.includes(row.field)) continue;

    seenFields.add(row.field);
    facts[row.field] = {
      field: row.field,
      value: row.value,
      confidence: row.confidence ?? 100,
      source: row.source,
      updatedAt: row.set_at,
    };
  }

  // Fill in from entity data for fields without provenance
  if (entityData) {
    const entityFields = extractEntityFields(input.entityType, entityData);
    for (const [field, value] of Object.entries(entityFields)) {
      if (seenFields.has(field)) continue;
      if (input.fields && !input.fields.includes(field)) continue;
      if (value == null) continue;

      facts[field] = {
        field,
        value,
        confidence: 100,
        source: "manual",
        updatedAt: String(entityData.updated_at ?? entityData.created_at ?? ""),
      };
    }
  }

  // Compute signals for this entity
  const signals = await computeSignals(
    admin,
    input.workspaceId,
    input.entityType,
    input.entityId,
    entityData
  );

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    facts,
    signals,
  };
}

async function fetchEntityData(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  entityType: LearningEntityType,
  entityId: string
): Promise<Record<string, unknown> | null> {
  const tableMap: Record<LearningEntityType, string> = {
    person: "people",
    organization: "organizations",
    work: "work",
    billing: "billing_records",
    meeting: "meetings",
    file: "files",
    me: "profiles",
  };

  const table = tableMap[entityType];
  if (!table) return null;

  const query = admin.from(table).select("*").eq("id", entityId);

  // Most tables have workspace_id, but profiles doesn't
  if (entityType !== "me") {
    query.eq("workspace_id", workspaceId);
  }

  const { data } = await query.maybeSingle();
  return data as Record<string, unknown> | null;
}

function extractEntityFields(
  entityType: LearningEntityType,
  data: Record<string, unknown>
): Record<string, unknown> {
  switch (entityType) {
    case "person":
      return {
        name: data.display_name ?? data.name,
        email: data.email,
        relationship_type: data.relationship_type,
        title: data.title,
        org_link: data.organization_id,
        phone: data.phone,
        billing_email: data.billing_email,
        timezone: data.timezone,
      };

    case "organization":
      return {
        name: data.name,
        website: data.website,
        industry: data.industry,
        relationship_status: data.relationship_status,
        key_contact: data.primary_contact_id,
        billing_email: data.billing_email,
      };

    case "work":
      return {
        name: data.name,
        status: data.status,
        description: data.description,
        deadline: data.deadline,
        start_date: data.start_date,
      };

    case "billing":
      return {
        number: data.number,
        status: data.status,
        organizationId: data.organization_id,
        personId: data.person_id,
        projectId: data.project_id,
      };

    case "meeting":
      return {
        title: data.title,
        status: data.status,
        meeting_type: data.meeting_type,
        organizationId: data.organization_id,
        personId: data.person_id,
        workId: data.work_id,
      };

    case "file":
      return {
        name: data.name ?? data.file_name,
        category: data.category,
        lifecycle_status: data.lifecycle_status,
        organizationId: data.organization_id,
        personId: data.person_id,
        workId: data.work_id,
      };

    case "me":
      return {
        display_name: data.display_name,
        role_title: data.role_title,
        tagline: data.tagline,
        timezone: data.timezone,
        phone: data.phone,
      };

    default:
      return {};
  }
}

async function computeSignals(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  entityType: LearningEntityType,
  entityId: string,
  entityData: Record<string, unknown> | null
): Promise<Record<string, boolean | number | string>> {
  const signals: Record<string, boolean | number | string> = {};

  // Signals are computed based on entity type
  switch (entityType) {
    case "person":
      await computePersonSignals(admin, workspaceId, entityId, entityData, signals);
      break;
    case "organization":
      await computeOrgSignals(admin, workspaceId, entityId, entityData, signals);
      break;
    case "billing":
      await computeBillingSignals(admin, workspaceId, entityId, entityData, signals);
      break;
    case "meeting":
      await computeMeetingSignals(admin, workspaceId, entityId, entityData, signals);
      break;
    // Add more as needed
  }

  return signals;
}

async function computePersonSignals(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  personId: string,
  _data: Record<string, unknown> | null,
  signals: Record<string, boolean | number | string>
): Promise<void> {
  // Check for payments received
  const { count: paymentCount } = await admin
    .from("billing_records")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("person_id", personId)
    .eq("status", "paid");

  signals.has_payment_received = (paymentCount ?? 0) > 0;

  // Check for invoices sent
  const { count: invoiceCount } = await admin
    .from("billing_records")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("person_id", personId)
    .in("status", ["due", "overdue", "paid", "partial"]);

  signals.has_invoice_sent = (invoiceCount ?? 0) > 0;

  // Check for calendar meetings
  const { count: meetingCount } = await admin
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("person_id", personId);

  signals.has_calendar_meeting = (meetingCount ?? 0) > 0;
}

async function computeOrgSignals(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  orgId: string,
  _data: Record<string, unknown> | null,
  signals: Record<string, boolean | number | string>
): Promise<void> {
  // Check for payments received from org
  const { count: paymentCount } = await admin
    .from("billing_records")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("organization_id", orgId)
    .eq("status", "paid");

  signals.org_has_payment_received = (paymentCount ?? 0) > 0;

  // Check for invoices sent to org
  const { count: invoiceCount } = await admin
    .from("billing_records")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("organization_id", orgId)
    .in("status", ["due", "overdue", "paid", "partial"]);

  signals.org_has_invoice_sent = (invoiceCount ?? 0) > 0;

  // Check for people in org
  const { count: peopleCount } = await admin
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("organization_id", orgId);

  signals.org_has_people = (peopleCount ?? 0) > 0;
}

async function computeBillingSignals(
  _admin: ReturnType<typeof createAdminClient>,
  _workspaceId: string,
  _billingId: string,
  data: Record<string, unknown> | null,
  signals: Record<string, boolean | number | string>
): Promise<void> {
  if (!data) return;

  const status = data.status as string | undefined;
  const dueAt = data.due_at as string | undefined;
  const amount = Number(data.amount ?? 0);
  const amountPaid = Number(data.amount_paid ?? 0);

  signals.billing_amount_paid_covers_total = amountPaid >= amount && amount > 0;
  signals.billing_due_date_passed =
    dueAt != null && new Date(dueAt) < new Date() && status !== "paid";
}

async function computeMeetingSignals(
  _admin: ReturnType<typeof createAdminClient>,
  _workspaceId: string,
  _meetingId: string,
  data: Record<string, unknown> | null,
  signals: Record<string, boolean | number | string>
): Promise<void> {
  if (!data) return;

  const endAt = data.end_at as string | undefined;
  const status = data.status as string | undefined;
  const externalId = data.external_id as string | undefined;

  signals.meeting_synced_from_calendar = externalId != null;
  signals.meeting_end_passed = endAt != null && new Date(endAt) < new Date();
  signals.meeting_cancelled_by_calendar = status === "cancelled";
}
