import { describe, it, expect } from "vitest";
import {
  VOCABULARY_REGISTRY,
  isValidVocabularyValue,
  getVocabularyValue,
  getVocabularyLabel,
  getVocabularyOptions,
  RELATIONSHIP_TYPES,
  WORK_STATUSES,
  WORK_TYPES,
  CURRENCIES,
  PAYMENT_TERMS,
  BILLING_CYCLES,
} from "./registry";

describe("VOCABULARY_REGISTRY", () => {
  it("contains all expected vocabularies", () => {
    const expectedKeys = [
      "relationship_type",
      "work_status",
      "work_type",
      "work_stage",
      "service_category",
      "currency",
      "payment_terms",
      "billing_cycle",
      "country",
      "timezone",
    ];

    for (const key of expectedKeys) {
      expect(VOCABULARY_REGISTRY[key]).toBeDefined();
      expect(VOCABULARY_REGISTRY[key].values.length).toBeGreaterThan(0);
    }
  });

  it("all vocabulary values have required fields", () => {
    for (const [key, vocab] of Object.entries(VOCABULARY_REGISTRY)) {
      for (const value of vocab.values) {
        expect(value.slug).toBeTruthy();
        expect(value.label).toBeTruthy();
        expect(value.aiDescription).toBeTruthy();
        expect(value.scope).toBeTruthy();
        expect(value.category).toBeTruthy();
        expect(typeof value.isSystem).toBe("boolean");
      }
    }
  });
});

describe("isValidVocabularyValue", () => {
  it("returns true for valid values", () => {
    expect(isValidVocabularyValue("relationship_type", "client")).toBe(true);
    expect(isValidVocabularyValue("work_status", "active")).toBe(true);
    expect(isValidVocabularyValue("currency", "USD")).toBe(true);
    expect(isValidVocabularyValue("payment_terms", "net_30")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isValidVocabularyValue("relationship_type", "invalid")).toBe(false);
    expect(isValidVocabularyValue("work_status", "bad_status")).toBe(false);
    expect(isValidVocabularyValue("currency", "FAKE")).toBe(false);
  });

  it("returns false for non-existent vocabulary", () => {
    expect(isValidVocabularyValue("not_a_vocabulary", "value")).toBe(false);
  });
});

describe("getVocabularyValue", () => {
  it("returns the value object for valid slugs", () => {
    const client = getVocabularyValue("relationship_type", "client");
    expect(client).toBeDefined();
    expect(client?.label).toBe("Client");
    expect(client?.aiDescription).toContain("paying customer");
  });

  it("returns undefined for invalid slugs", () => {
    expect(getVocabularyValue("relationship_type", "invalid")).toBeUndefined();
  });
});

describe("getVocabularyLabel", () => {
  it("returns label for valid values", () => {
    expect(getVocabularyLabel("relationship_type", "prospect")).toBe("Prospect");
    expect(getVocabularyLabel("work_type", "retainer")).toBe("Retainer");
    expect(getVocabularyLabel("billing_cycle", "quarterly")).toBe("Quarterly");
  });

  it("returns slug as fallback for invalid values", () => {
    expect(getVocabularyLabel("relationship_type", "unknown_value")).toBe("unknown_value");
  });
});

describe("getVocabularyOptions", () => {
  it("returns options sorted by sortOrder", () => {
    const options = getVocabularyOptions("relationship_type");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].value).toBe("client");
    expect(options[0].label).toBe("Client");
  });

  it("returns empty array for non-existent vocabulary", () => {
    expect(getVocabularyOptions("not_a_vocabulary")).toEqual([]);
  });
});

describe("type arrays", () => {
  it("RELATIONSHIP_TYPES matches vocabulary values", () => {
    const vocabSlugs = VOCABULARY_REGISTRY.relationship_type.values.map((v) => v.slug);
    for (const type of RELATIONSHIP_TYPES) {
      expect(vocabSlugs).toContain(type);
    }
  });

  it("WORK_STATUSES matches vocabulary values", () => {
    const vocabSlugs = VOCABULARY_REGISTRY.work_status.values.map((v) => v.slug);
    for (const status of WORK_STATUSES) {
      expect(vocabSlugs).toContain(status);
    }
  });

  it("CURRENCIES matches vocabulary values", () => {
    const vocabSlugs = VOCABULARY_REGISTRY.currency.values.map((v) => v.slug);
    for (const currency of CURRENCIES) {
      expect(vocabSlugs).toContain(currency);
    }
  });

  it("PAYMENT_TERMS matches vocabulary values", () => {
    const vocabSlugs = VOCABULARY_REGISTRY.payment_terms.values.map((v) => v.slug);
    for (const term of PAYMENT_TERMS) {
      expect(vocabSlugs).toContain(term);
    }
  });

  it("BILLING_CYCLES matches vocabulary values", () => {
    const vocabSlugs = VOCABULARY_REGISTRY.billing_cycle.values.map((v) => v.slug);
    for (const cycle of BILLING_CYCLES) {
      expect(vocabSlugs).toContain(cycle);
    }
  });
});
