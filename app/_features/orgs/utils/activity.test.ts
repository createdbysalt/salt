import { describe, it, expect } from "vitest";
import { mapOrgProvenanceToActivity, orgProfileFieldLabel } from "./activity";

describe("org activity mapping", () => {
  it("labels org profile fields", () => {
    expect(orgProfileFieldLabel("website")).toBe("website");
    expect(orgProfileFieldLabel("key_contact")).toBe("key contact");
  });

  it("maps manual provenance to user activity", () => {
    const event = mapOrgProvenanceToActivity({
      field: "website",
      value: "northwind.co",
      source: "manual",
      ruleId: null,
      confidence: 100,
      because: "You corrected this field",
      status: "applied",
      evidence: {},
      setAt: "2026-06-01T12:00:00.000Z",
    });

    expect(event.kind).toBe("user");
    expect(event.label).toContain("website");
    expect(event.detail).toContain("northwind.co");
  });
});
