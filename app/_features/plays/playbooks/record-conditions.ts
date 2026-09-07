/**
 * Record-condition triggers (playbooks Phase 5)
 *
 * User-authorable "when a record field matches" conditions. Deterministic —
 * no LLM, no metering. This module is the shared vocabulary:
 * - parser: validates condition fields against the memory field registry
 * - trigger-dispatch: evaluates conditions on field writes
 * - signal-scanner: evaluates conditions on the 2h sweep
 * - Overview UI: the condition picker offers only registry-known fields
 *
 * Client-safe: imports only the field registry (type-only deps + data).
 */

import {
  getFieldsForEntity,
  type ContractEntityType,
  type FieldDescriptor,
  type FieldType,
} from "@/app/_features/memory/taxonomy/field-registry";
import type {
  PlaybookRecordConditionTrigger,
  RecordConditionEntity,
  RecordConditionOp,
} from "@/app/_features/plays/playbooks/schema/v2/types";

/** Trigger entity vocabulary → field-registry entityType. */
export const RECORD_CONDITION_ENTITY_TO_REGISTRY: Record<
  RecordConditionEntity,
  ContractEntityType
> = {
  billing: "billing",
  work: "work",
  person: "person",
  org: "org",
  resource: "resource",
};

/** Trigger entity → SignalTriggerContext entitySurface. */
export const RECORD_CONDITION_ENTITY_TO_SURFACE: Record<
  RecordConditionEntity,
  "billing" | "work" | "person" | "organization" | "resource"
> = {
  billing: "billing",
  work: "work",
  person: "person",
  org: "organization",
  resource: "resource",
};

/**
 * memoryUpdateField route key → trigger entity. Entities outside the
 * record-condition vocabulary (meeting, me) have no mapping.
 */
export const RECORD_CONDITION_ROUTE_KEY_TO_ENTITY: Record<
  string,
  RecordConditionEntity | undefined
> = {
  person: "person",
  organization: "org",
  work: "work",
  billing: "billing",
  resource: "resource",
};

/**
 * True when the field is registry-known for the entity — by registry key
 * ("relationshipType") or by dbColumn spelling ("relationship_type"), since
 * field writes arrive in either spelling.
 */
export function isRecordConditionField(
  entity: RecordConditionEntity,
  field: string
): boolean {
  return Boolean(findFieldDescriptor(entity, field));
}

export function findFieldDescriptor(
  entity: RecordConditionEntity,
  field: string
): FieldDescriptor | undefined {
  return getFieldsForEntity(RECORD_CONDITION_ENTITY_TO_REGISTRY[entity]).find(
    (descriptor) =>
      descriptor.key === field || descriptor.dbColumn === field
  );
}

export interface RecordConditionFieldOption {
  key: string;
  label: string;
  fieldType: FieldType;
}

/**
 * Picker options for the Overview trigger section: real, comprehensible
 * fields only — readonly/system-derived values (health scores, badges) are
 * computed, never written, so a condition on them could never fire from a
 * field write.
 */
export function listRecordConditionFields(
  entity: RecordConditionEntity
): RecordConditionFieldOption[] {
  return getFieldsForEntity(RECORD_CONDITION_ENTITY_TO_REGISTRY[entity])
    .filter((descriptor) => !descriptor.isReadonly && descriptor.dbColumn)
    .map((descriptor) => ({
      key: descriptor.key,
      label: descriptor.label,
      fieldType: descriptor.fieldType,
    }));
}

/**
 * Evaluate a condition against an actual value (the field write's new value,
 * or a scanned row's column). Strings compare case-insensitively for
 * eq/neq/contains; gt/lt coerce to numbers when both sides parse, otherwise
 * compare as strings (ISO dates order lexicographically).
 */
export function evaluateConditionValue(
  op: RecordConditionOp,
  expected: string,
  actual: unknown
): boolean {
  if (actual === null || actual === undefined) {
    return false;
  }

  const actualStr = String(actual);

  switch (op) {
    case "eq":
      return actualStr.toLowerCase() === expected.toLowerCase();
    case "neq":
      return actualStr.toLowerCase() !== expected.toLowerCase();
    case "contains":
      return actualStr.toLowerCase().includes(expected.toLowerCase());
    case "gt":
    case "lt": {
      const actualNum = Number(actualStr);
      const expectedNum = Number(expected);
      if (!Number.isNaN(actualNum) && !Number.isNaN(expectedNum)) {
        return op === "gt" ? actualNum > expectedNum : actualNum < expectedNum;
      }
      return op === "gt"
        ? actualStr > expected
        : actualStr < expected;
    }
  }
}

/** Synthetic signal key for cooldown + run provenance. */
export function recordConditionSignalKey(
  entity: RecordConditionEntity,
  field: string
): string {
  return `record_condition.${entity}.${field}`;
}

/* ── Picker vocabulary (Overview trigger section) ─────────────────────────── */

export const RECORD_CONDITION_ENTITIES: RecordConditionEntity[] = [
  "person",
  "org",
  "work",
  "billing",
  "resource",
];

export const RECORD_CONDITION_ENTITY_LABELS: Record<
  RecordConditionEntity,
  string
> = {
  person: "People",
  org: "Organizations",
  work: "Work",
  billing: "Billing",
  resource: "Resources",
};

export const RECORD_CONDITION_OPS: RecordConditionOp[] = [
  "eq",
  "neq",
  "gt",
  "lt",
  "contains",
];

export const RECORD_CONDITION_OP_LABELS: Record<RecordConditionOp, string> = {
  eq: "is",
  neq: "is not",
  gt: "is more than",
  lt: "is less than",
  contains: "contains",
};

/**
 * Initial condition when an author switches a play to record_condition:
 * the canonical "a person becomes a client" example from the field
 * registry, ready to edit.
 */
export function defaultRecordConditionTrigger(): PlaybookRecordConditionTrigger {
  const personFields = listRecordConditionFields("person");
  const field = personFields.some((f) => f.key === "relationshipType")
    ? "relationshipType"
    : (personFields[0]?.key ?? "relationshipType");
  return {
    type: "record_condition",
    entity: "person",
    field,
    op: "eq",
    value: "client",
  };
}
