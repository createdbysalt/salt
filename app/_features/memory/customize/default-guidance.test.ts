import { describe, expect, it } from "vitest";
import {
  defaultGuidanceForType,
  isMemoryCustomizeEntityType,
  MEMORY_CUSTOMIZE_ENTITY_TYPES,
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
});
