import { describe, it, expect } from "vitest";
import {
  evaluateConditionValue,
  isRecordConditionField,
  listRecordConditionFields,
  recordConditionSignalKey,
} from "./record-conditions";

describe("isRecordConditionField", () => {
  it("accepts registry keys and dbColumn spellings", () => {
    expect(isRecordConditionField("person", "relationshipType")).toBe(true);
    expect(isRecordConditionField("person", "relationship_type")).toBe(true);
    expect(isRecordConditionField("billing", "status")).toBe(true);
    expect(isRecordConditionField("work", "status")).toBe(true);
    expect(isRecordConditionField("org", "name")).toBe(true);
  });

  it("accepts resource fields (contract-review trigger)", () => {
    expect(isRecordConditionField("resource", "category")).toBe(true);
    expect(isRecordConditionField("resource", "documentType")).toBe(true);
    expect(isRecordConditionField("resource", "document_type")).toBe(true);
  });

  it("rejects unknown fields and cross-entity fields", () => {
    expect(isRecordConditionField("person", "bogus_field")).toBe(false);
    expect(isRecordConditionField("billing", "relationshipType")).toBe(false);
    expect(isRecordConditionField("resource", "relationshipType")).toBe(false);
  });
});

describe("listRecordConditionFields", () => {
  it("offers writable fields with labels for every entity", () => {
    for (const entity of ["billing", "work", "person", "org", "resource"] as const) {
      const options = listRecordConditionFields(entity);
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) {
        expect(option.key).toBeTruthy();
        expect(option.label).toBeTruthy();
      }
    }
  });

  it("excludes readonly system-derived fields", () => {
    const personKeys = listRecordConditionFields("person").map((o) => o.key);
    expect(personKeys).not.toContain("healthScore");
  });
});

describe("evaluateConditionValue", () => {
  it("eq/neq compare case-insensitively", () => {
    expect(evaluateConditionValue("eq", "client", "Client")).toBe(true);
    expect(evaluateConditionValue("eq", "client", "prospect")).toBe(false);
    expect(evaluateConditionValue("neq", "client", "prospect")).toBe(true);
    expect(evaluateConditionValue("neq", "client", "CLIENT")).toBe(false);
  });

  it("contains matches substrings case-insensitively", () => {
    expect(evaluateConditionValue("contains", "agency", "Acme Agency LLC")).toBe(true);
    expect(evaluateConditionValue("contains", "agency", "Acme Studio")).toBe(false);
  });

  it("gt/lt compare numerically when both sides parse", () => {
    expect(evaluateConditionValue("gt", "500", "1200")).toBe(true);
    expect(evaluateConditionValue("gt", "500", "120")).toBe(false);
    expect(evaluateConditionValue("lt", "500", "120")).toBe(true);
  });

  it("gt/lt fall back to lexicographic order (ISO dates)", () => {
    expect(evaluateConditionValue("gt", "2026-01-01", "2026-06-15")).toBe(true);
    expect(evaluateConditionValue("lt", "2026-01-01", "2025-12-31")).toBe(true);
  });

  it("never fires on null/undefined actuals", () => {
    expect(evaluateConditionValue("eq", "client", null)).toBe(false);
    expect(evaluateConditionValue("neq", "client", undefined)).toBe(false);
    expect(evaluateConditionValue("contains", "x", null)).toBe(false);
  });
});

describe("recordConditionSignalKey", () => {
  it("builds a stable synthetic key", () => {
    expect(recordConditionSignalKey("person", "relationshipType")).toBe(
      "record_condition.person.relationshipType"
    );
  });
});
