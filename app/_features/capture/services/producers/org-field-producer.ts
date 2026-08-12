import { createAdminClient } from "@/app/_lib/supabase/admin";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import { getFieldsForEntity } from "@/app/_features/memory/taxonomy/field-registry";
import { isPersonalDomain } from "@/app/_features/capture/services/system-plays/person-signals";
import { resolvePerson } from "@/app/_features/capture/services/system-plays/person-resolver";
import { linkPersonToOrg } from "@/app/_features/capture/services/system-plays/org-resolver";
import { executeSystemPlay } from "@/app/_features/capture/services/system-plays/executor";
import {
  ORG_FIELD_SIGNAL_KEYS,
  type DerivedOrgFields,
} from "./record-field-types";

export interface ProduceOrgFieldsResult {
  orgId: string | null;
  orgCreated: boolean;
  dispatched: string[];
  contactLinked: boolean;
  billingWrites: number;
  addressWrites: number;
}

/** Registry field key → address component (compound write, Track G). */
const ORG_ADDRESS_COMPONENT_BY_FIELD_KEY: Record<string, keyof NonNullable<DerivedOrgFields["address"]>> = {
  addressLine1: "line1",
  addressLine2: "line2",
  city: "city",
  state: "state",
  postalCode: "postalCode",
  country: "country",
};

/**
 * Compound-address writes from billing payloads. Confidence and because
 * come from the registry's org_address_extracted rule per field — same
 * pattern as the compound person address.
 */
async function writeOrgAddressComponents(input: {
  workspaceId: string;
  orgId: string;
  fields: DerivedOrgFields;
  captureId?: string;
}): Promise<number> {
  const address = input.fields.address;
  if (!address) return 0;

  const orgFields = getFieldsForEntity("org");
  let writes = 0;

  for (const [fieldKey, component] of Object.entries(
    ORG_ADDRESS_COMPONENT_BY_FIELD_KEY,
  )) {
    const value = address[component];
    if (!value) continue;

    const field = orgFields.find((f) => f.key === fieldKey);
    if (!field?.dbColumn) continue;
    const rule = (field.fillRules ?? []).find(
      (r) => r.signal === "org_address_extracted",
    );

    await memoryUpdateField({
      workspaceId: input.workspaceId,
      entityType: "organization",
      entityId: input.orgId,
      field: field.dbColumn,
      value,
      confidence: rule?.confidence ?? 82,
      because: rule?.because ?? "Address extracted from documents or invoices",
      source: "enrichment",
      sourceDetails: {
        playbookSlug: "memory-records",
        captureId: input.captureId,
        ruleId: `org-${fieldKey}-org_address_extracted`,
      },
    });
    writes++;
  }

  return writes;
}

interface OrgRow {
  id: string;
  name: string;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

async function findOrgByDomain(
  workspaceId: string,
  domain: string,
): Promise<OrgRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("domain", domain)
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  return (data as OrgRow | null) ?? null;
}

async function findOrgByName(
  workspaceId: string,
  name: string,
): Promise<OrgRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .ilike("name", escapeLike(name))
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  return (data as OrgRow | null) ?? null;
}

function billingRule(fieldKey: string) {
  const field = getFieldsForEntity("billing").find((f) => f.key === fieldKey);
  return field?.fillRules?.find((r) => r.signal === "billing_party_email_match");
}

async function writeBillingField(input: {
  workspaceId: string;
  billingRecordId: string;
  fieldKey: string;
  dbColumn: "person_id" | "organization_id" | "work_id";
  value: string;
  captureId?: string;
}): Promise<boolean> {
  const rule = billingRule(input.fieldKey);
  if (!rule) return false;
  const result = await memoryUpdateField({
    workspaceId: input.workspaceId,
    entityType: "billing",
    entityId: input.billingRecordId,
    field: input.dbColumn,
    value: input.value,
    confidence: rule.confidence,
    because: rule.because,
    source: "enrichment",
    sourceDetails: {
      playbookSlug: "memory-records",
      captureId: input.captureId,
      ruleId: `billing-${input.fieldKey}-billing_party_email_match`,
    },
  });
  return result.action === "applied";
}

/**
 * Writes billing counterparty fields (person / org / work) for billing
 * records tied to the resolved contact. Direct writes — not runCareForSignal
 * dispatches — so the reference write never collides with the
 * billing_party_email_match signal's party-email fill rules.
 */
async function fillBillingCounterparty(input: {
  workspaceId: string;
  orgId: string;
  personId: string;
  personName?: string;
  captureId?: string;
}): Promise<number> {
  const admin = createAdminClient();
  let writes = 0;

  if (input.personName) {
    const { data: pending } = await admin
      .from("billing_records")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .is("person_id", null)
      .is("deleted_at", null)
      .is("archived_at", null)
      .ilike("metadata->>pending_person_name", escapeLike(input.personName));
    for (const row of (pending as Array<{ id: string }> | null) ?? []) {
      const applied = await writeBillingField({
        workspaceId: input.workspaceId,
        billingRecordId: row.id,
        fieldKey: "billingContact",
        dbColumn: "person_id",
        value: input.personId,
        captureId: input.captureId,
      });
      if (applied) writes += 1;
    }
  }

  const { data: missingOrg } = await admin
    .from("billing_records")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("person_id", input.personId)
    .is("organization_id", null)
    .is("deleted_at", null)
    .is("archived_at", null);
  for (const row of (missingOrg as Array<{ id: string }> | null) ?? []) {
    const applied = await writeBillingField({
      workspaceId: input.workspaceId,
      billingRecordId: row.id,
      fieldKey: "organization",
      dbColumn: "organization_id",
      value: input.orgId,
      captureId: input.captureId,
    });
    if (applied) writes += 1;
  }

  const { data: workRows } = await admin
    .from("work")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("billing_contact_id", input.personId)
    .is("deleted_at", null)
    .is("archived_at", null);
  const workIds = (workRows as Array<{ id: string }> | null) ?? [];
  if (workIds.length === 1) {
    const { data: missingWork } = await admin
      .from("billing_records")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("person_id", input.personId)
      .is("work_id", null)
      .is("deleted_at", null)
      .is("archived_at", null);
    for (const row of (missingWork as Array<{ id: string }> | null) ?? []) {
      const applied = await writeBillingField({
        workspaceId: input.workspaceId,
        billingRecordId: row.id,
        fieldKey: "linkedWork",
        dbColumn: "work_id",
        value: workIds[0].id,
        captureId: input.captureId,
      });
      if (applied) writes += 1;
    }
  }

  return writes;
}

/**
 * Track A org producer: resolves a CRM account to a Salt org (creating one
 * only from a website domain), dispatches the org fill signals through the
 * records capability, links the account's contact, and backfills billing
 * counterparty references.
 */
export async function produceOrgFieldSignals(input: {
  workspaceId: string;
  orgKey: string;
  fields: DerivedOrgFields;
  source: string;
  captureId?: string;
}): Promise<ProduceOrgFieldsResult> {
  const empty: ProduceOrgFieldsResult = {
    orgId: null,
    orgCreated: false,
    dispatched: [],
    contactLinked: false,
    billingWrites: 0,
    addressWrites: 0,
  };

  const [kind, ...rest] = input.orgKey.split(":");
  const value = rest.join(":");
  if (!value) return empty;
  if (kind === "domain" && isPersonalDomain(`probe@${value}`)) return empty;
  if (kind !== "domain" && kind !== "name") return empty;

  let org = kind === "domain"
    ? await findOrgByDomain(input.workspaceId, value)
    : await findOrgByName(input.workspaceId, value);

  let orgCreated = false;
  if (!org && kind === "domain" && input.fields.name) {
    const created = await executeSystemPlay(input.workspaceId, "system:create-org", {
      name: input.fields.name,
      domain: value,
    });
    if (created.success && created.entity_id) {
      org = { id: created.entity_id, name: input.fields.name };
      orgCreated = true;
    }
  }
  if (!org) return empty;

  const dispatched: string[] = [];
  for (const signal of ORG_FIELD_SIGNAL_KEYS) {
    const signalValue = input.fields.signalValues[signal];
    if (!signalValue) continue;
    await runCareForSignal({
      workspaceId: input.workspaceId,
      entityType: "organization",
      entityId: org.id,
      signalKey: signal,
      evidence: {
        source: input.source,
        captureId: input.captureId,
        signalValues: { [signal]: signalValue },
      },
    });
    dispatched.push(signal);
  }

  // Track G: the tax ID rides the signal (single column); the address is a
  // compound write across six columns.
  if (input.fields.taxId) {
    await runCareForSignal({
      workspaceId: input.workspaceId,
      entityType: "organization",
      entityId: org.id,
      signalKey: "org_tax_id_extracted",
      evidence: {
        source: input.source,
        captureId: input.captureId,
        signalValues: { org_tax_id_extracted: input.fields.taxId },
      },
    });
    dispatched.push("org_tax_id_extracted");
  }
  const addressWrites = await writeOrgAddressComponents({
    workspaceId: input.workspaceId,
    orgId: org.id,
    fields: input.fields,
    captureId: input.captureId,
  });

  let contactLinked = false;
  let billingWrites = 0;
  if (input.fields.contactEmail) {
    const person = await resolvePerson(input.workspaceId, {
      email: input.fields.contactEmail,
      name: input.fields.name,
    });
    if (person.resolved && person.person_id) {
      await linkPersonToOrg(input.workspaceId, person.person_id, org.id);
      contactLinked = true;
      // A live person link is recordStatus evidence (Track G). The fill
      // rule is a constant (eq:true), so the value rides as a boolean.
      await runCareForSignal({
        workspaceId: input.workspaceId,
        entityType: "organization",
        entityId: org.id,
        signalKey: "org_has_people",
        evidence: {
          source: input.source,
          captureId: input.captureId,
          signalValues: { org_has_people: true },
        },
      });
      billingWrites = await fillBillingCounterparty({
        workspaceId: input.workspaceId,
        orgId: org.id,
        personId: person.person_id,
        personName: person.person_name,
        captureId: input.captureId,
      });
    }
  }

  return { orgId: org.id, orgCreated, dispatched, contactLinked, billingWrites, addressWrites };
}
