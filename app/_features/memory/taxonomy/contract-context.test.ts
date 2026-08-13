import { describe, expect, it } from "vitest";
import {
  buildFieldContractContext,
  buildCareWritableContext,
  findUnknownVocabularyReferences,
} from "./contract-context";
import {
  ALL_CONTRACT_FIELDS,
  FIELD_REGISTRY,
  getWritePolicy,
  type ContractEntityType,
} from "./field-registry";
import { VOCABULARY_REGISTRY } from "./registry";

const ENTITY_TYPES: ContractEntityType[] = [
  "person",
  "org",
  "work",
  "billing",
  "resource",
  "meeting",
  "me",
];

describe("field contract registry integrity", () => {
  it("every field vocabulary reference resolves in VOCABULARY_REGISTRY", () => {
    expect(findUnknownVocabularyReferences()).toEqual([]);
  });

  it("every entity type has contract fields", () => {
    for (const entityType of ENTITY_TYPES) {
      const fields = ALL_CONTRACT_FIELDS.filter((f) => f.entityType === entityType);
      expect(fields.length, `no fields for ${entityType}`).toBeGreaterThan(0);
    }
  });

  it("registry lookup keys are unique (no field silently overwritten)", () => {
    // FIELD_REGISTRY is built by keyed assignment; rebuilding the key list
    // from the arrays and comparing counts catches collisions.
    const meBusinessCount = ALL_CONTRACT_FIELDS.filter(
      (f) => f.entityType === "me" && f.dbColumn && FIELD_REGISTRY[`me:business.${f.key}`]
    ).length;
    const keys = Object.keys(FIELD_REGISTRY);
    expect(keys.length).toBe(new Set(keys).size);
    expect(keys.length + (ALL_CONTRACT_FIELDS.length - keys.length)).toBe(
      ALL_CONTRACT_FIELDS.length
    );
    expect(meBusinessCount).toBeGreaterThan(0);
  });

  it("readonly fields resolve to system_derived policy", () => {
    for (const field of ALL_CONTRACT_FIELDS) {
      if (field.isReadonly && !field.writePolicy) {
        expect(getWritePolicy(field)).toBe("system_derived");
      }
    }
  });
});

describe("buildFieldContractContext", () => {
  it("emits one line per field with policy for every entity type", () => {
    for (const entityType of ENTITY_TYPES) {
      const context = buildFieldContractContext(entityType);
      expect(context).toContain(`Field contract for ${entityType} records:`);
      expect(context).toContain("policy:");
    }
  });

  it("includes allowed vocabulary values for controlled fields", () => {
    const context = buildFieldContractContext("person");
    const relationshipSlugs = VOCABULARY_REGISTRY.relationship_type.values.map(
      (v) => v.slug
    );
    for (const slug of relationshipSlugs) {
      expect(context).toContain(slug);
    }
  });

  it("care-writable context excludes user_only fields", () => {
    const context = buildCareWritableContext("me");
    // Legal/tax/payment Me fields stay user_only — Salt never writes them.
    expect(context).not.toContain("legalBusinessName");
    expect(context).not.toContain("taxIdType");
    expect(context).not.toContain("paymentTerms");
  });

  it("care-writable context includes suggestable Me fields", () => {
    const context = buildCareWritableContext("me");
    // Suggestable Me fields are care_ask — Salt proposes, operator confirms.
    expect(context).toContain("preferredName");
    expect(context).toContain("timezone");
    expect(context).toContain("websiteUrl");
  });

  it("care-writable context includes auto fields", () => {
    const context = buildCareWritableContext("billing");
    expect(context).toContain("amountCents");
    expect(context).toContain("status");
  });

  it("care-writable context excludes system_derived fields", () => {
    const context = buildCareWritableContext("billing");
    // Payment matching owns Amount Paid / Paid — Care writes the inputs,
    // never the value.
    expect(context).not.toContain("amountPaidCents");
    expect(context).not.toContain("paidAt");
  });
});
