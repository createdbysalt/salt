import "server-only";

/**
 * Person Field Producer (Phase 4 of
 * .cursor/plans/2026-08-10-registry-wiring-record-sourcing.md)
 *
 * Turns connector-payload extractions (Stripe/QBO customer details,
 * Cal.com/Calendly invitees, CRM contacts) into person field writes through
 * the two registry-governed paths:
 *
 * - 1:1 fields (phone, timezone, title, name, billing email): dispatched as
 *   `person_*_extracted` signals carrying the value in
 *   `evidence.signalValues`. The Care records capability evaluates the
 *   registry fillRule ({{extracted}}) and writes via memoryUpdateField with
 *   the rule's confidence/because — care enablement, tiered bars, and
 *   evidence chains all apply.
 * - Compound address (one payload → six columns): written directly via
 *   memoryUpdateField with the registry rule's confidence/because, because
 *   a single signal value cannot fan out to per-column values. Provenance
 *   ruleIds still name the `person_address_extracted` rule.
 * - Contact timestamps (DMs, completed meetings): direct min/max writes to
 *   first/last_contact_at — low-stakes bookkeeping that must never regress
 *   the relationship clock during backfills.
 */

import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import { memoryUpdateField } from "@/app/_lib/memory-tools";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getFieldsForEntity } from "@/app/_features/memory/taxonomy/field-registry";
import {
  PERSON_FIELD_SIGNAL_KEYS,
  type DerivedPersonFields,
  type PersonAddressExtraction,
} from "./person-field-types";

export {
  PERSON_FIELD_SIGNAL_KEYS,
  type PersonFieldSignalKey,
  type PersonFieldSignalValues,
  type PersonAddressExtraction,
  type PersonContactAttestation,
  type PersonContactSignal,
  type DerivedPersonFields,
} from "./person-field-types";

export interface ProducePersonFieldsResult {
  /** Signal keys dispatched to the records capability. */
  dispatched: string[];
  /** Address component writes attempted. */
  addressWrites: number;
  /** Contact-timestamp writes (first/last contact bookkeeping). */
  contactWrites: number;
}

/** Registry field key → address component. */
const ADDRESS_COMPONENT_BY_FIELD_KEY: Record<string, keyof PersonAddressExtraction> = {
  addressLine1: "line1",
  addressLine2: "line2",
  city: "city",
  state: "state",
  postalCode: "postalCode",
  country: "country",
};

export async function producePersonFieldSignals(input: {
  workspaceId: string;
  personId: string;
  fields: DerivedPersonFields;
  /** Producer label for evidence, e.g. the connector sourceType. */
  source: string;
  captureId?: string;
}): Promise<ProducePersonFieldsResult> {
  const dispatched: string[] = [];

  for (const key of PERSON_FIELD_SIGNAL_KEYS) {
    const value = input.fields.signalValues[key];
    if (!value) continue;
    await runCareForSignal({
      workspaceId: input.workspaceId,
      signalKey: key,
      entityType: "person",
      entityId: input.personId,
      evidence: {
        signalValues: { [key]: value },
        producer: input.source,
        captureId: input.captureId,
      },
    });
    dispatched.push(key);
  }

  const addressWrites = await writeAddressComponents(input);
  const contactWrites = await writeContactTimestamps(input);

  return { dispatched, addressWrites, contactWrites };
}

/**
 * Contact-timestamp bookkeeping (DMs, completed meetings). Mirrors
 * person-resolver's email path: low-stakes timestamps with min/max semantics
 * so backfills never regress the relationship clock. last_contact_at goes
 * through memoryUpdateField with the registry fillRule's confidence/because
 * for the attesting signal (capture_message_received,
 * capture_meeting_completed); first_contact_at is a plain direct write.
 */
async function writeContactTimestamps(input: {
  workspaceId: string;
  personId: string;
  fields: DerivedPersonFields;
  captureId?: string;
}): Promise<number> {
  const contact = input.fields.contactAt;
  if (!contact) return 0;

  const admin = createAdminClient();
  const { data: person } = await admin
    .from("people")
    .select("first_contact_at, last_contact_at")
    .eq("id", input.personId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();
  if (!person) return 0;

  let writes = 0;

  if (!person.first_contact_at || contact.at < person.first_contact_at) {
    await admin
      .from("people")
      .update({ first_contact_at: contact.at })
      .eq("id", input.personId)
      .eq("workspace_id", input.workspaceId);
    writes++;
  }

  if (!person.last_contact_at || contact.at > person.last_contact_at) {
    const field = getFieldsForEntity("person").find(
      (f) => f.key === "lastContactedAt"
    );
    const rule = (field?.fillRules ?? []).find(
      (r) => r.signal === contact.signal
    );

    await memoryUpdateField({
      workspaceId: input.workspaceId,
      entityType: "person",
      entityId: input.personId,
      field: "last_contact_at",
      value: contact.at,
      confidence: rule?.confidence ?? 100,
      because: rule?.because ?? "Touchpoint with this person",
      source: "enrichment",
      sourceDetails: {
        playbookSlug: "memory-records",
        captureId: input.captureId,
        ruleId: `person-lastContactedAt-${contact.signal}`,
      },
    });
    writes++;
  }

  return writes;
}

/**
 * Compound-address writes. Confidence and because come from the registry's
 * person_address_extracted rule per field, so the write path and the
 * Customize card cannot drift.
 */
async function writeAddressComponents(input: {
  workspaceId: string;
  personId: string;
  fields: DerivedPersonFields;
  source: string;
  captureId?: string;
}): Promise<number> {
  const address = input.fields.address;
  if (!address) return 0;

  const personFields = getFieldsForEntity("person");
  let writes = 0;

  for (const [fieldKey, component] of Object.entries(
    ADDRESS_COMPONENT_BY_FIELD_KEY
  )) {
    const value = address[component];
    if (!value) continue;

    const field = personFields.find((f) => f.key === fieldKey);
    if (!field?.dbColumn) continue;
    const rule = (field.fillRules ?? []).find(
      (r) => r.signal === "person_address_extracted"
    );

    await memoryUpdateField({
      workspaceId: input.workspaceId,
      entityType: "person",
      entityId: input.personId,
      field: field.dbColumn,
      value,
      confidence: rule?.confidence ?? 80,
      because: rule?.because ?? "Address extracted from a billing payload",
      source: "enrichment",
          sourceDetails: {
            playbookSlug: "memory-records",
            captureId: input.captureId,
            ruleId: `person-${fieldKey}-person_address_extracted`,
          },
    });
    writes++;
  }

  return writes;
}
