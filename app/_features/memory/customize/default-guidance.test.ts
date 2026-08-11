import { describe, expect, it } from "vitest";
import {
  defaultGuidanceForScope,
  defaultGuidanceForType,
  EXAMPLE_ENTRIES,
  headerDescriptionForScope,
  isMemoryCustomizeEntityType,
  isMemoryCustomizeScope,
  MEMORY_CUSTOMIZE_ENTITY_TYPES,
  MEMORY_CUSTOMIZE_SCOPE_TITLES,
  MEMORY_CUSTOMIZE_SCOPES,
  scopesForPrompt,
} from "./default-guidance";
import { getFieldsForEntity } from "../taxonomy/field-registry";

describe("MEMORY_CUSTOMIZE_ENTITY_TYPES", () => {
  it("ships exactly the v1 tabs: People, Orgs, Work, Resources, Meetings", () => {
    expect(MEMORY_CUSTOMIZE_ENTITY_TYPES).toEqual([
      "person",
      "org",
      "work",
      "resource",
      "meeting",
    ]);
  });

  it("excludes deferred types (billing, me, note)", () => {
    expect(isMemoryCustomizeEntityType("billing")).toBe(false);
    expect(isMemoryCustomizeEntityType("me")).toBe(false);
    expect(isMemoryCustomizeEntityType("note")).toBe(false);
    expect(isMemoryCustomizeEntityType("person")).toBe(true);
  });
});

describe("general scope", () => {
  it("leads the dropdown order, ahead of the record types", () => {
    expect(MEMORY_CUSTOMIZE_SCOPES).toEqual([
      "general",
      ...MEMORY_CUSTOMIZE_ENTITY_TYPES,
    ]);
  });

  it("is a scope, not a record type", () => {
    expect(isMemoryCustomizeScope("general")).toBe(true);
    expect(isMemoryCustomizeEntityType("general")).toBe(false);
    expect(isMemoryCustomizeScope("person")).toBe(true);
    expect(isMemoryCustomizeScope("billing")).toBe(false);
  });

  it("ships first-person guidance with no banned machinery words", () => {
    const guidance = defaultGuidanceForScope("general");
    expect(guidance.entityType).toBe("general");
    expect(guidance.summary.length).toBeGreaterThan(0);
    expect(guidance.sections.length).toBeGreaterThan(0);
    const allText = [
      guidance.summary,
      ...guidance.sections.flatMap((s) => [s.heading, ...s.lines]),
    ].join("\n");
    expect(allText).not.toMatch(
      /\b(trigger|webhook|sync|scope|rule|adapter|pipeline|config)\b/i,
    );
  });

  it("delegates record types to the per-type guidance", () => {
    expect(defaultGuidanceForScope("person")).toEqual(
      defaultGuidanceForType("person"),
    );
  });
});

describe("scopesForPrompt", () => {
  it("always includes general first — its lines apply to every type", () => {
    expect(scopesForPrompt(["person", "work"])).toEqual([
      "general",
      "person",
      "work",
    ]);
  });

  it("defaults to general plus every record type", () => {
    expect(scopesForPrompt()).toEqual(["general", ...MEMORY_CUSTOMIZE_ENTITY_TYPES]);
  });
});

describe("defaultGuidanceForType", () => {
  it("every v1 type returns a first-person summary and sections", () => {
    for (const type of MEMORY_CUSTOMIZE_ENTITY_TYPES) {
      const guidance = defaultGuidanceForType(type);
      expect(guidance.entityType).toBe(type);
      expect(guidance.summary.length).toBeGreaterThan(0);
      expect(guidance.sections.length).toBeGreaterThan(0);
      for (const section of guidance.sections) {
        expect(section.lines.length).toBeGreaterThan(0);
      }
    }
  });

  it("renders the auto-filled field list live from the field registry", () => {
    const guidance = defaultGuidanceForType("person");
    const allLines = guidance.sections.flatMap((s) => s.lines).join("\n");

    // The registry gives person an email field with a fill rule — the
    // guidance must mention the field by its registry label so copy can't
    // drift from behavior.
    const personFields = getFieldsForEntity("person");
    const autoFilled = personFields.filter(
      (f) => f.fillRules && f.fillRules.length > 0 && !f.isReadonly,
    );
    expect(autoFilled.length).toBeGreaterThan(0);
    expect(allLines).toContain(autoFilled[0].label);
  });

  it("names fields Salt never writes (user_only) as such", () => {
    const guidance = defaultGuidanceForType("resource");
    const allLines = guidance.sections.flatMap((s) => s.lines).join("\n");

    // resource title is user_only in the registry.
    expect(allLines).toContain("Title");
    expect(allLines).toMatch(/never/i);
  });

  it("meetings ships thin, honest copy (content deepens later)", () => {
    const guidance = defaultGuidanceForType("meeting");
    expect(guidance.summary).toMatch(/still growing|growing/i);
  });

  it("never uses banned machinery words in any line", () => {
    const banned = /\b(trigger|webhook|sync|scope|rule|adapter|pipeline|config)\b/i;
    for (const type of MEMORY_CUSTOMIZE_ENTITY_TYPES) {
      const guidance = defaultGuidanceForType(type);
      const allText = [
        guidance.summary,
        ...guidance.sections.flatMap((s) => [s.heading, ...s.lines]),
      ].join("\n");
      expect(allText).not.toMatch(banned);
    }
  });

  it("header descriptions cover every scope and stay free of banned words", () => {
    const banned = /\b(trigger|webhook|sync|scope|rule|adapter|pipeline|config)\b/i;
    for (const scope of MEMORY_CUSTOMIZE_SCOPES) {
      const description = headerDescriptionForScope(scope);
      expect(description.length).toBeGreaterThan(0);
      expect(description).not.toMatch(banned);
    }
  });

  it("header titles name the records and cover every scope", () => {
    expect(MEMORY_CUSTOMIZE_SCOPE_TITLES.general).toBe("All Record Types");
    for (const scope of MEMORY_CUSTOMIZE_SCOPES) {
      expect(MEMORY_CUSTOMIZE_SCOPE_TITLES[scope]).toMatch(/Record/);
    }
  });

  it("renders field groups live from the registry, matching the sentence lines", () => {
    for (const type of MEMORY_CUSTOMIZE_ENTITY_TYPES) {
      const guidance = defaultGuidanceForType(type);
      const groups = guidance.fieldGroups!;
      const sentenceText = guidance.sections.flatMap((s) => s.lines).join("\n");
      // Chips and prose read the same registry — they can never disagree.
      for (const label of groups.autoFilled.slice(0, 6)) {
        expect(sentenceText).toContain(label);
      }
    }
  });

  it("general has no field groups — it owns no fields", () => {
    expect(defaultGuidanceForScope("general").fieldGroups).toBeNull();
  });

  it("ships example entries for every scope, free of banned words", () => {
    const banned = /\b(trigger|webhook|sync|scope|rule|adapter|pipeline|config)\b/i;
    for (const scope of MEMORY_CUSTOMIZE_SCOPES) {
      const examples = EXAMPLE_ENTRIES[scope];
      expect(examples.length).toBeGreaterThan(0);
      for (const example of examples) {
        expect(example).not.toMatch(banned);
        expect(example.length).toBeLessThanOrEqual(500);
      }
    }
  });
});
