import { describe, it, expect } from "vitest";
import { normalizeTagSlug, normalizeTagLabel, isValidTagSlug, slugToLabel } from "./normalize";

describe("normalizeTagSlug", () => {
  it("converts to lowercase kebab-case", () => {
    expect(normalizeTagSlug("Hello World")).toBe("hello-world");
    expect(normalizeTagSlug("VIP Client")).toBe("vip-client");
    expect(normalizeTagSlug("HIGH_PRIORITY")).toBe("high-priority");
  });

  it("singularizes common plurals", () => {
    expect(normalizeTagSlug("Startups")).toBe("startup");
    expect(normalizeTagSlug("agencies")).toBe("agency");
    expect(normalizeTagSlug("Companies")).toBe("company");
    expect(normalizeTagSlug("industries")).toBe("industry");
  });

  it("handles irregular plurals", () => {
    expect(normalizeTagSlug("People")).toBe("person");
    expect(normalizeTagSlug("children")).toBe("child");
  });

  it("preserves uncountable nouns", () => {
    expect(normalizeTagSlug("Software")).toBe("software");
    expect(normalizeTagSlug("feedback")).toBe("feedback");
    expect(normalizeTagSlug("data")).toBe("data");
  });

  it("removes special characters", () => {
    expect(normalizeTagSlug("Can't Stop")).toBe("cant-stop");
    expect(normalizeTagSlug("Hello (World)")).toBe("hello-world");
    expect(normalizeTagSlug("Test & Test")).toBe("test-test");
  });

  it("collapses multiple dashes", () => {
    expect(normalizeTagSlug("Hello   World")).toBe("hello-world");
    expect(normalizeTagSlug("Hello--World")).toBe("hello-world");
  });

  it("handles edge cases", () => {
    expect(normalizeTagSlug("")).toBe("");
    expect(normalizeTagSlug("   ")).toBe("");
    expect(normalizeTagSlug("a")).toBe("a");
  });
});

describe("normalizeTagLabel", () => {
  it("title cases words", () => {
    expect(normalizeTagLabel("hello world")).toBe("Hello World");
    expect(normalizeTagLabel("VIP")).toBe("Vip");
    expect(normalizeTagLabel("HIGH PRIORITY")).toBe("High Priority");
  });

  it("normalizes whitespace", () => {
    expect(normalizeTagLabel("  hello   world  ")).toBe("Hello World");
  });
});

describe("isValidTagSlug", () => {
  it("accepts valid slugs", () => {
    expect(isValidTagSlug("startup")).toBe(true);
    expect(isValidTagSlug("high-priority")).toBe(true);
    expect(isValidTagSlug("vip-123")).toBe(true);
    expect(isValidTagSlug("a")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(isValidTagSlug("")).toBe(false);
    expect(isValidTagSlug("123-start")).toBe(false);
    expect(isValidTagSlug("-leading")).toBe(false);
    expect(isValidTagSlug("trailing-")).toBe(false);
    expect(isValidTagSlug("has spaces")).toBe(false);
  });
});

describe("slugToLabel", () => {
  it("converts slug to title case label", () => {
    expect(slugToLabel("high-priority")).toBe("High Priority");
    expect(slugToLabel("vip")).toBe("Vip");
    expect(slugToLabel("startup-founder")).toBe("Startup Founder");
  });
});
