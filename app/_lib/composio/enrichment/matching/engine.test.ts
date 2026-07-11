import { describe, it, expect } from "vitest";
import {
  matchField,
  matchFieldToDeterministic,
  matchFieldToFuzzy,
  matchAllFields,
} from "./engine";
import { normalizeFieldName, normalizeFieldNameAggressive } from "./normalize";
import { jaroWinkler } from "./jaro-winkler";
import { routeByConfidence, assignConfidence } from "./confidence-router";

describe("normalizeFieldName", () => {
  it("lowercases field names", () => {
    expect(normalizeFieldName("Email")).toBe("email");
    expect(normalizeFieldName("EMAIL")).toBe("email");
  });

  it("removes separators", () => {
    expect(normalizeFieldName("customer_email")).toBe("customeremail");
    expect(normalizeFieldName("customer-email")).toBe("customeremail");
    expect(normalizeFieldName("customer.email")).toBe("customeremail");
    expect(normalizeFieldName("customer email")).toBe("customeremail");
  });

  it("removes trailing id", () => {
    expect(normalizeFieldName("customer_id")).toBe("customer");
    expect(normalizeFieldName("customerId")).toBe("customer");
  });
});

describe("normalizeFieldNameAggressive", () => {
  it("removes common prefixes", () => {
    expect(normalizeFieldNameAggressive("customer_email")).toBe("email");
    expect(normalizeFieldNameAggressive("client_name")).toBe("name");
    expect(normalizeFieldNameAggressive("user_phone")).toBe("phone");
  });
});

describe("jaroWinkler", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroWinkler("email", "email")).toBe(1);
  });

  it("returns high score for similar strings", () => {
    expect(jaroWinkler("email", "emial")).toBeGreaterThan(0.9);
    expect(jaroWinkler("customeremail", "customermail")).toBeGreaterThan(0.9);
  });

  it("returns low score for different strings", () => {
    expect(jaroWinkler("email", "phone")).toBeLessThan(0.7);
  });
});

describe("matchFieldToDeterministic", () => {
  const targetFields = ["email", "name", "phone", "address_line_1"];

  it("matches exact field names", () => {
    const result = matchFieldToDeterministic("email", targetFields);
    expect(result).not.toBeNull();
    expect(result?.targetField).toBe("email");
    expect(result?.confidence).toBe(0.99);
    expect(result?.method).toBe("deterministic");
  });

  it("matches normalized field names", () => {
    const result = matchFieldToDeterministic("customer_email", ["email", "name"]);
    expect(result).toBeNull();

    const result2 = matchFieldToDeterministic("Email", targetFields);
    expect(result2).not.toBeNull();
    expect(result2?.targetField).toBe("email");
  });

  it("returns null when no match", () => {
    const result = matchFieldToDeterministic("unknown_field", targetFields);
    expect(result).toBeNull();
  });
});

describe("matchFieldToFuzzy", () => {
  const targetFields = ["email", "name", "phone", "address_line_1", "city"];

  it("matches with aggressive normalization", () => {
    const results = matchFieldToFuzzy("customer_email", targetFields);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].targetField).toBe("email");
    expect(results[0].method).toBe("fuzzy");
  });

  it("matches with Jaro-Winkler similarity", () => {
    const results = matchFieldToFuzzy("emailaddress", ["email", "phone"]);
    expect(results.some((r) => r.targetField === "email")).toBe(true);
  });

  it("returns empty array when no match", () => {
    const results = matchFieldToFuzzy("zzzzz", targetFields, {
      jaroWinklerThreshold: 0.95,
      tokenOverlapThreshold: 0.9,
    });
    expect(results).toEqual([]);
  });
});

describe("matchField", () => {
  const targetFields = ["email", "name", "phone", "address_line_1"];

  it("prefers deterministic over fuzzy", () => {
    const result = matchField("email", targetFields);
    expect(result?.method).toBe("deterministic");
    expect(result?.confidence).toBe(0.99);
  });

  it("falls back to fuzzy when no deterministic match", () => {
    const result = matchField("customer_email", targetFields);
    expect(result?.method).toBe("fuzzy");
    expect(result?.targetField).toBe("email");
  });
});

describe("matchAllFields", () => {
  it("matches multiple source fields to targets", () => {
    const sourceFields = ["email", "customer_name", "phone_number"];
    const targetFields = ["email", "name", "phone", "city"];

    const results = matchAllFields(sourceFields, targetFields);

    expect(results.get("email")?.targetField).toBe("email");
    expect(results.get("customer_name")?.targetField).toBe("name");
  });

  it("does not double-assign targets", () => {
    const sourceFields = ["email", "contact_email"];
    const targetFields = ["email"];

    const results = matchAllFields(sourceFields, targetFields);

    expect(results.size).toBe(1);
    expect(results.get("email")?.targetField).toBe("email");
  });
});

describe("routeByConfidence", () => {
  it("routes high-stakes fields correctly", () => {
    expect(routeByConfidence("amount_cents", 0.99)).toBe("auto_accept");
    expect(routeByConfidence("amount_cents", 0.95)).toBe("flag_review");
    expect(routeByConfidence("amount_cents", 0.85)).toBe("human_review");
  });

  it("routes standard fields correctly", () => {
    expect(routeByConfidence("email", 0.95)).toBe("auto_accept");
    expect(routeByConfidence("email", 0.85)).toBe("flag_review");
    expect(routeByConfidence("email", 0.70)).toBe("human_review");
  });

  it("routes low-stakes fields correctly", () => {
    expect(routeByConfidence("notes", 0.85)).toBe("auto_accept");
    expect(routeByConfidence("notes", 0.70)).toBe("flag_review");
    expect(routeByConfidence("notes", 0.50)).toBe("human_review");
  });
});

describe("assignConfidence", () => {
  it("caps deterministic at 0.99", () => {
    expect(assignConfidence("deterministic", 1.0)).toBe(0.99);
  });

  it("discounts fuzzy matches", () => {
    expect(assignConfidence("fuzzy", 1.0)).toBe(0.95);
    expect(assignConfidence("fuzzy", 0.9)).toBeCloseTo(0.855);
  });

  it("discounts LLM matches heavily", () => {
    expect(assignConfidence("llm", 1.0)).toBe(0.85);
    expect(assignConfidence("llm", 0.9)).toBeCloseTo(0.765);
  });
});
