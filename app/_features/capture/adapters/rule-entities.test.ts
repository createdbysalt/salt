import { describe, expect, it } from "vitest";
import {
  CATEGORY_RULE_ENTITY_OPTIONS,
  ENTITY_TYPE_LABELS,
  ruleEntityOptionsForCategory,
} from "./rule-entities";
import type { ConnectorRuleEntityType } from "./types";
import type { ConnectorCategory } from "@/app/_lib/composio/enrichment/types";

const ALL_CATEGORIES: ConnectorCategory[] = [
  "email",
  "calendar",
  "billing",
  "crm",
  "meetings",
  "documents",
  "storage",
  "project_management",
  "communication",
];

describe("rule entity vocabulary", () => {
  it("every capture category has at least one rule entity option", () => {
    for (const category of ALL_CATEGORIES) {
      const options = ruleEntityOptionsForCategory(category);
      expect(options.length, `category ${category}`).toBeGreaterThan(0);
    }
  });

  it("email offers sender email, domain, sender name pattern, and subject pattern", () => {
    const types = ruleEntityOptionsForCategory("email").map((o) => o.type);
    expect(types).toEqual([
      "sender_email",
      "domain",
      "sender_pattern",
      "subject_pattern",
    ]);
  });

  it("calendar offers organizer, title pattern, and attendee", () => {
    const types = ruleEntityOptionsForCategory("calendar").map((o) => o.type);
    expect(types).toEqual(["organizer", "title_pattern", "attendee"]);
  });

  it("communication offers channel, author, and keyword", () => {
    const types = ruleEntityOptionsForCategory("communication").map(
      (o) => o.type,
    );
    expect(types).toEqual(["channel", "author", "keyword"]);
  });

  it("meetings offers host, title pattern, and participant", () => {
    const types = ruleEntityOptionsForCategory("meetings").map((o) => o.type);
    expect(types).toEqual(["host", "title_pattern", "participant"]);
  });

  it("storage and documents offer owner and name pattern", () => {
    for (const category of ["storage", "documents"] as const) {
      const types = ruleEntityOptionsForCategory(category).map((o) => o.type);
      expect(types, `category ${category}`).toEqual(["owner", "name_pattern"]);
    }
  });

  it("project_management offers assignee and project", () => {
    const types = ruleEntityOptionsForCategory("project_management").map(
      (o) => o.type,
    );
    expect(types).toEqual(["assignee", "project"]);
  });

  it("options carry user-facing labels and input placeholders", () => {
    for (const category of ALL_CATEGORIES) {
      for (const option of ruleEntityOptionsForCategory(category)) {
        expect(option.label.length).toBeGreaterThan(0);
        expect(option.placeholder.length).toBeGreaterThan(0);
      }
    }
  });

  it("every entity type used in the matrix has a short label", () => {
    const used = new Set<ConnectorRuleEntityType>();
    for (const options of Object.values(CATEGORY_RULE_ENTITY_OPTIONS)) {
      for (const option of options) used.add(option.type);
    }
    for (const type of used) {
      expect(
        ENTITY_TYPE_LABELS[type],
        `label for ${type}`,
      ).toBeTruthy();
    }
  });

  it("unknown categories resolve to no options", () => {
    expect(
      ruleEntityOptionsForCategory("not-a-category" as ConnectorCategory),
    ).toEqual([]);
  });
});
