import { describe, expect, it } from "vitest";
import { evaluatePersonProfileFields } from "./apply-person-profile";
import { defaultPeopleProfileRules } from "./validate-rules";

describe("evaluatePersonProfileFields", () => {
  it("classifies finance payment as client", () => {
    const result = evaluatePersonProfileFields({
      email: "maya@acme.com",
      signals: { has_payment_received: true },
      systemRules: defaultPeopleProfileRules(),
      settings: null,
    });

    expect(result.relationshipType).toBe("client");
    expect(result.results[0]?.field).toBe("relationship_type");
    expect(result.results[0]?.ruleId).toBe("relationship_type:has_payment_received");
  });

  it("classifies workspace domain as team when context fact matches", () => {
    const result = evaluatePersonProfileFields({
      email: "sam@usesalt.io",
      signals: {},
      systemRules: defaultPeopleProfileRules(),
      settings: {
        autoApplyThreshold: 85,
        aiFallbackEnabled: true,
        contextFacts: { workspace_domains: ["usesalt.io"] },
        fillRulesOverride: null,
        activeSections: ["relationship_type"],
      },
    });

    expect(result.relationshipType).toBe("team");
  });

  it("does not queue unknown relationship fallback when signals are inconclusive", () => {
    const result = evaluatePersonProfileFields({
      email: "random@gmail.com",
      signals: {},
      systemRules: defaultPeopleProfileRules(),
      settings: {
        autoApplyThreshold: 85,
        aiFallbackEnabled: true,
        contextFacts: {},
        fillRulesOverride: null,
        activeSections: ["relationship_type"],
      },
    });

    expect(result.relationshipType).toBe("unknown");
    expect(result.results.find((r) => r.field === "relationship_type")).toBeUndefined();
  });

  it("queues prospect fallback when you initiated the thread", () => {
    const result = evaluatePersonProfileFields({
      email: "alex@example.net",
      signals: { you_initiated: true },
      systemRules: defaultPeopleProfileRules(),
      settings: {
        autoApplyThreshold: 85,
        aiFallbackEnabled: true,
        contextFacts: {},
        fillRulesOverride: null,
        activeSections: ["relationship_type"],
      },
    });

    const rel = result.results.find((r) => r.field === "relationship_type");
    expect(rel?.value).toBe("prospect");
    expect(rel?.status).toBe("pending");
  });
});
