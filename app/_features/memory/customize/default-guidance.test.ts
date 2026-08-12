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
  it("ships the tabs: People, Orgs, Work, Resources, Meetings, Billing", () => {
    expect(MEMORY_CUSTOMIZE_ENTITY_TYPES).toEqual([
      "person",
      "org",
      "work",
      "resource",
      "meeting",
      "billing",
    ]);
  });

  it("excludes deferred types (me, note)", () => {
    expect(isMemoryCustomizeEntityType("me")).toBe(false);
    expect(isMemoryCustomizeEntityType("note")).toBe(false);
    expect(isMemoryCustomizeEntityType("billing")).toBe(true);
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
    expect(isMemoryCustomizeScope("billing")).toBe(true);
    expect(isMemoryCustomizeScope("me")).toBe(false);
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

  it("every type ships a connections section describing how it links", () => {
    for (const type of MEMORY_CUSTOMIZE_ENTITY_TYPES) {
      const guidance = defaultGuidanceForType(type);
      const section = guidance.sections.find((s) => s.kind === "connections");
      expect(section, `${type} connections section`).toBeDefined();
      expect(section!.lines.length).toBeGreaterThan(0);
    }
  });

  it("person connections name the records a person links to", () => {
    const guidance = defaultGuidanceForType("person");
    const section = guidance.sections.find((s) => s.kind === "connections")!;
    const text = section.lines.join("\n");
    expect(text).toMatch(/organization/i);
    expect(text).toMatch(/work/i);
    expect(text).toMatch(/billing/i);
  });

  it("billing copy honors the system-of-record principle", () => {
    const guidance = defaultGuidanceForType("billing");
    // The billing app owns the numbers; payment matching keeps status
    // honest; direction is set by the user once and never rewritten.
    expect(guidance.summary).toMatch(/payment matching/i);
    const allLines = guidance.sections.flatMap((s) => s.lines).join("\n");
    expect(allLines).toContain("Direction");
    expect(allLines).toMatch(/never/i);
  });

  it("billing keeps payment-matched fields out of what Salt fills", () => {
    const guidance = defaultGuidanceForType("billing");
    // Amount Paid and Paid are system_derived — payment matching writes
    // them, Memory Care never does, so they can't appear as auto-filled.
    expect(guidance.fieldGroups!.autoFilled).not.toContain("Amount Paid");
    expect(guidance.fieldGroups!.autoFilled).not.toContain("Paid");
    expect(guidance.fieldGroups!.neverTouched).toContain("Direction");
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

describe("field sourcing (people-field-sourcing canvas)", () => {
  it("person fields carry the canvas sourcing note (best source, today, gap)", () => {
    const fields = getFieldsForEntity("person");
    const byKey = new Map(fields.map((field) => [field.key, field]));

    const expected: Record<string, { gap: boolean }> = {
      name: { gap: false },
      email: { gap: false },
      billingEmail: { gap: false },
      phone: { gap: false },
      timezone: { gap: false },
      title: { gap: false },
      relationshipType: { gap: false },
      recordStatus: { gap: true },
      lastContactedAt: { gap: false },
      notes: { gap: true },
    };

    for (const [key, { gap }] of Object.entries(expected)) {
      const field = byKey.get(key);
      expect(field?.sourcing, `${key} sourcing`).toBeDefined();
      expect(field!.sourcing!.best.length).toBeGreaterThan(0);
      expect(field!.sourcing!.today?.length ?? 0).toBeGreaterThan(0);
      expect(Boolean(field!.sourcing!.gap), `${key} gap`).toBe(gap);
    }

    // The canvas treats address as one row; the registry splits it across
    // six fields — all of them point at billing as the authority.
    for (const key of [
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "postalCode",
      "country",
    ]) {
      expect(byKey.get(key)?.sourcing?.best, `${key} sourcing`).toMatch(
        /billing/i,
      );
    }
  });

  it("person guidance states the source precedence principle", () => {
    const guidance = defaultGuidanceForType("person");
    const principle = guidance.sections.find(
      (section) => section.kind === "principle",
    );
    expect(principle).toBeDefined();
    expect(principle?.heading).toMatch(/sources disagree/i);
    const text = principle?.lines.join("\n") ?? "";
    expect(text).toMatch(/CRM/i);
    expect(text).toMatch(/billing/i);
    expect(text).toMatch(/scheduling/i);
    expect(text).toMatch(/email/i);
  });

  it("person summary stays one line; birth logic lives in its accordion", () => {
    const guidance = defaultGuidanceForType("person");
    // The card pattern: a short statement up top, detail behind dropdowns.
    expect(guidance.summary.length).toBeLessThanOrEqual(100);
    const birth = guidance.sections.find((section) => section.kind === "birth");
    expect(birth).toBeDefined();
    const text = birth?.lines.join("\n") ?? "";
    expect(text).toMatch(/real evidence/i);
    expect(text).toMatch(/merge/i);
    expect(text).toMatch(/newsletter/i);
  });

  it("sourcing copy stays free of banned machinery words", () => {
    const banned = /\b(trigger|webhook|sync|scope|rule|adapter|pipeline|config)\b/i;
    for (const type of MEMORY_CUSTOMIZE_ENTITY_TYPES) {
      for (const field of getFieldsForEntity(type)) {
        if (!field.sourcing) continue;
        const text = [field.sourcing.best, field.sourcing.today ?? ""].join("\n");
        expect(text, `${type}.${field.key} sourcing`).not.toMatch(banned);
      }
    }
  });

  it("gap flags match the plan's gap inventory per record type", () => {
    // The "new source" pill scoreboard. A field leaves this list only when
    // its best-source producer lands (Tracks A-G); Track H (signing apps)
    // keeps lifecycleStatus/signedDate pilled until connectors exist.
    const expectedGaps: Record<string, string[]> = {
      person: ["recordStatus", "notes"],
      org: [
        "name",
        "billingEmail",
        "industryParent",
        "industryChild",
        "primaryContact",
        "addressLine1",
        "addressLine2",
        "city",
        "state",
        "postalCode",
        "country",
        "taxId",
        "tags",
        "recordStatus",
        "lastContactedAt",
      ],
      work: [
        "workType",
        "stage",
        "contractValueCents",
        "finalPriceCents",
        "currency",
        "paymentType",
        "hourlyRateCents",
        "retainerMrrCents",
        "decisionDate",
        "estimatedTimeline",
        "discountPercent",
        "discountAmountCents",
        "discountReason",
        "tags",
      ],
      resource: [
        "category",
        "documentType",
        "description",
        "lifecycleStatus",
        "totalAmountCents",
        "currency",
        "dueDate",
        "expiryDate",
        "signedDate",
        "followUpDate",
        "tags",
      ],
      meeting: ["meetingType", "status", "description", "attendees"],
      billing: [
        "category",
        "organization",
        "billingContact",
        "linkedWork",
        "vendorLabel",
        "tags",
      ],
    };

    for (const [type, gapKeys] of Object.entries(expectedGaps)) {
      const fields = getFieldsForEntity(
        type as (typeof MEMORY_CUSTOMIZE_ENTITY_TYPES)[number],
      );
      const actualGaps = fields
        .filter((field) => field.sourcing?.gap)
        .map((field) => field.key)
        .sort();
      expect(actualGaps, `${type} gap inventory`).toEqual([...gapKeys].sort());
    }
  });

  it("every gapped field names its best source and today's reality", () => {
    for (const type of MEMORY_CUSTOMIZE_ENTITY_TYPES) {
      for (const field of getFieldsForEntity(type)) {
        if (!field.sourcing?.gap) continue;
        expect(
          field.sourcing.best.length,
          `${type}.${field.key} best`,
        ).toBeGreaterThan(0);
        expect(
          field.sourcing.today?.length ?? 0,
          `${type}.${field.key} today`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("fill-rule copy credits every producer, not just email", () => {
    const byKey = new Map(
      getFieldsForEntity("person").map((field) => [field.key, field]),
    );
    const text = (key: string) =>
      (byKey.get(key)?.fillRules ?? []).map((rule) => rule.because).join("\n");

    // CRM produces name/title/phone; scheduling bookings produce
    // phone/timezone; billing produces billing email + address; Slack
    // profiles produce name/title/phone/timezone; meeting attendee lists
    // corroborate name.
    expect(text("name")).toMatch(/CRM/i);
    expect(text("name")).toMatch(/Slack/i);
    expect(text("name")).toMatch(/meeting/i);
    expect(text("title")).toMatch(/CRM/i);
    expect(text("title")).toMatch(/Slack/i);
    expect(text("phone")).toMatch(/CRM/i);
    expect(text("phone")).toMatch(/booking/i);
    expect(text("phone")).toMatch(/Slack/i);
    expect(text("timezone")).toMatch(/booking/i);
    expect(text("timezone")).toMatch(/Slack/i);
    expect(text("billingEmail")).toMatch(/billing/i);
    expect(text("addressLine1")).toMatch(/billing/i);
    expect(text("lastContactedAt")).toMatch(/direct message/i);
  });
});
